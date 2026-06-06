"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { encodeFunctionData, isAddress, parseAbi } from "viem";
import { useSendTransaction, useWaitForTransactionReceipt } from "wagmi";
import {
  analyzeContractAddress,
  riskLabelFromVerdict,
  riskColorFromScore,
  type ContractAuditResult,
  type AIVulnerability,
} from "../../lib/contractAuditor";
import { useLeaked } from "../../lib/useChainWatch";
import { StatusBanner } from "./StatusBanner";

const monadExplorerUrl = process.env.NEXT_PUBLIC_MONAD_EXPLORER_URL;

function scoreTone(score: number): string {
  if (score >= 70) return "text-rose-300";
  if (score >= 40) return "text-amber-300";
  return "text-emerald-300";
}

function scoreBarColor(score: number): string {
  return riskColorFromScore(score);
}

/* ─── AI Agent message generation ─── */

type AgentMessage = {
  id: string;
  text: string;
  type: "analysis" | "risk" | "action" | "success" | "info";
  actionLabel?: string;
  actionType?: "revoke" | "monitor";
};

function buildThreatDetail(bc: ContractAuditResult["bytecode"], r: ContractAuditResult): AgentMessage[] {
  const details: AgentMessage[] = [];
  if (!bc) return details;

  if (r.isBlacklisted) {
    details.push({
      id: "detail-blacklist",
      text: "LISTA NEGRA: Esta dirección aparece en bases de datos públicas de contratos maliciosos. Esto significa que ya ha sido reportada por otros usuarios o investigadores de seguridad como un contrato fraudulento. Es muy probable que haya sido usada en estafas previas, phishing o rug-pulls confirmados.",
      type: "risk",
    });
  }

  if (bc.hasSelfdestruct) {
    details.push({
      id: "detail-selfdestruct",
      text: "SELFDESTRUCT detectado: El contrato contiene el opcode SELFDESTRUCT (0xFF), que permite al owner destruir el contrato y enviar todo el ETH almacenado a una dirección arbitraria. En la práctica, esto significa que el creador puede vaciar el contrato en cualquier momento sin previo aviso: todos los fondos depositados desaparecen en una sola transacción. Es uno de los vectores de rug-pull más directos.",
      type: "risk",
    });
  }

  if (bc.hasDelegatecall && !bc.isMinimalProxy) {
    details.push({
      id: "detail-delegatecall",
      text: "DELEGATECALL detectado: Este opcode permite que el contrato ejecute código de OTRO contrato pero en su propio contexto de almacenamiento. El peligro real: el owner puede cambiar la dirección del contrato de implementación y así cambiar completamente el comportamiento — por ejemplo, hoy el contrato funciona normalmente, mañana la lógica se reemplaza y roba todos los fondos. Es el mecanismo detrás de muchos ataques de \"upgrade malicioso\".",
      type: "risk",
    });
  }

  if (bc.hasHiddenMint) {
    details.push({
      id: "detail-mint",
      text: "MINT OCULTO: Detecté la firma de función mint (0x40c10f19) sin restricción de acceso tipo onlyOwner verificable. Esto significa que alguien podría crear tokens ilimitados de la nada. El ataque típico: el deployer mintea millones de tokens, los vende en el pool de liquidez, colapsa el precio y los holders se quedan con tokens sin valor. Es el patrón clásico de \"infinite mint rug-pull\".",
      type: "risk",
    });
  }

  if (bc.hasHiddenFee) {
    details.push({
      id: "detail-fee",
      text: "FEE OCULTO: El bytecode muestra un patrón inusual de operaciones SSTORE/SLOAD (más de 15/20 respectivamente), lo cual es consistente con lógica de comisiones ocultas. En estos contratos, cada transferencia puede descontar un porcentaje que va al deployer. Algunos llegan a cobrar hasta el 99% de cada transacción, haciendo imposible vender o mover tus tokens de manera rentable.",
      type: "risk",
    });
  }

  if (bc.hasSuspiciousTransfer) {
    details.push({
      id: "detail-honeypot",
      text: "PATRÓN HONEYPOT: Encontré las firmas de transfer (0xa9059cbb) y approve (0x095ea7b3) combinadas con el uso de tx.origin. Este patrón es un honeypot clásico: puedes COMPRAR el token, pero cuando intentas VENDER, la transacción falla o se revierte silenciosamente. El contrato usa tx.origin para discriminar entre el owner (que sí puede vender) y las víctimas (que no pueden). Una vez que compras, tus fondos quedan atrapados.",
      type: "risk",
    });
  }

  if (bc.isProxy && !bc.isMinimalProxy) {
    details.push({
      id: "detail-proxy",
      text: "PROXY UPGRADEABLE: Este contrato es un proxy, lo que significa que la lógica real vive en otro contrato que puede ser reemplazado. Aunque los proxies son legítimos en muchos protocolos (Uniswap, Aave los usan), también representan un riesgo: el admin del proxy puede cambiar toda la lógica del contrato sin que los usuarios lo noten. Verifica quién controla el upgrade y si hay un timelock de seguridad.",
      type: "risk",
    });
  } else if (bc.isMinimalProxy) {
    details.push({
      id: "detail-minproxy",
      text: "PROXY MÍNIMO (EIP-1167): Este contrato es un clone que delega toda su lógica a un contrato de implementación. La lógica NO puede cambiar (a diferencia de proxies upgradeables), pero debes verificar que el contrato de implementación al que apunta sea seguro. El riesgo está en lo que hace ese contrato destino, no en el proxy en sí.",
      type: "analysis",
    });
  }

  if (bc.hasOrigin && !bc.hasSuspiciousTransfer) {
    details.push({
      id: "detail-origin",
      text: "TX.ORIGIN detectado: El contrato usa tx.origin para autenticación en lugar de msg.sender. Esto es una vulnerabilidad conocida: si interactúas con este contrato a través de otro contrato (por ejemplo, un DEX agregador), un atacante puede explotar la diferencia entre tx.origin y msg.sender para ejecutar acciones en tu nombre sin tu autorización directa.",
      type: "risk",
    });
  }

  return details;
}

function buildAgentMessages(r: ContractAuditResult): AgentMessage[] {
  const msgs: AgentMessage[] = [];
  const addr = `${r.contractAddress.slice(0, 6)}…${r.contractAddress.slice(-4)}`;
  const bc = r.bytecode;

  const threatCount = [
    bc?.hasSelfdestruct,
    bc?.hasDelegatecall && !bc?.isMinimalProxy,
    bc?.hasHiddenMint,
    bc?.hasHiddenFee,
    bc?.hasSuspiciousTransfer,
    bc?.isProxy,
    r.isBlacklisted,
    bc?.hasOrigin && !bc?.hasSuspiciousTransfer,
  ].filter(Boolean).length;

  if (threatCount > 0) {
    msgs.push({
      id: "scan",
      text: `Escaneé el bytecode del contrato ${addr} y detecté ${threatCount} señal${threatCount > 1 ? "es" : ""} de riesgo. Voy a explicarte cada una en detalle para que entiendas exactamente qué hace este contrato y por qué es peligroso.`,
      type: "analysis",
    });
  } else {
    const verified = r.verification?.isVerified;
    const verifiedNote = verified === true
      ? " El código fuente está verificado en el explorador, lo cual es una buena señal de transparencia."
      : verified === false
        ? " Sin embargo, el código fuente NO está verificado en el explorador, lo que impide auditar la lógica interna."
        : "";
    msgs.push({
      id: "scan",
      text: `Escaneé el bytecode completo del contrato ${addr} (${bc?.size ?? 0} bytes). No encontré opcodes peligrosos (sin SELFDESTRUCT, DELEGATECALL ni tx.origin), ni patrones de honeypot, mint oculto o fees sospechosos.${verifiedNote}`,
      type: "analysis",
    });
  }

  const threatDetails = buildThreatDetail(bc, r);
  msgs.push(...threatDetails);

  if (r.verification && threatCount > 0) {
    const v = r.verification;
    if (v.isVerified === false) {
      msgs.push({
        id: "detail-unverified",
        text: `Además, el código fuente de este contrato NO está verificado en el explorador (${v.source}). Esto agrava el riesgo: sin código fuente público, no se puede auditar la lógica interna, lo que es una red flag adicional. Los proyectos legítimos siempre verifican su código.`,
        type: "risk",
      });
    } else if (v.isVerified === true) {
      msgs.push({
        id: "detail-verified",
        text: `El código fuente sí está verificado en ${v.source}${v.compilerVersion ? ` (Solidity ${v.compilerVersion})` : ""}. Aunque esto permite auditar la lógica, no garantiza que sea seguro — solo que el código es público. Los problemas de bytecode que detecté siguen siendo válidos.`,
        type: "analysis",
      });
    }
  }

  // AI-powered analysis from Claude
  const ai = r.ai;
  if (ai?.available && ai.summary) {
    msgs.push({
      id: "ai-summary",
      text: `🧠 Análisis de IA (Claude): ${ai.summary}`,
      type: "analysis",
    });

    if (ai.sourceCodeAnalysis) {
      msgs.push({
        id: "ai-source",
        text: `📝 Análisis del código fuente: ${ai.sourceCodeAnalysis}`,
        type: "analysis",
      });
    }

    if (ai.vulnerabilities.length > 0) {
      for (const [i, vuln] of ai.vulnerabilities.entries()) {
        const severityLabel =
          vuln.severity === "critical" ? "🔴 CRÍTICA"
            : vuln.severity === "high" ? "🟠 ALTA"
              : vuln.severity === "medium" ? "🟡 MEDIA"
                : vuln.severity === "low" ? "🔵 BAJA"
                  : "ℹ️ INFO";

        msgs.push({
          id: `ai-vuln-${i}`,
          text: `${severityLabel} — ${vuln.name}: ${vuln.description} | Impacto: ${vuln.impact} | Recomendación: ${vuln.recommendation}`,
          type: vuln.severity === "critical" || vuln.severity === "high" ? "risk" : "analysis",
        });
      }
    }

    if (ai.riskNarrative) {
      msgs.push({
        id: "ai-narrative",
        text: `🎯 Evaluación final de IA: ${ai.riskNarrative}`,
        type: r.riskScore >= 70 ? "risk" : r.riskScore >= 40 ? "analysis" : "info",
      });
    }
  }

  if (r.riskScore >= 70) {
    msgs.push({
      id: "risk",
      text: `VEREDICTO: Riesgo CRÍTICO (${r.riskScore}/100). Los patrones detectados son consistentes con un rug-pull, scam o contrato diseñado para robar fondos. Cualquier approval (permiso de gasto) activo hacia este contrato pone tus tokens en peligro inmediato — el contrato podría drenar tu wallet en cualquier momento.`,
      type: "risk",
    });
    msgs.push({
      id: "action",
      text: "Acción urgente: Recomiendo revocar INMEDIATAMENTE cualquier approval que hayas dado a este contrato. Esto le quita el permiso de mover tus tokens. ¿Quieres que prepare la transacción de revocación?",
      type: "action",
      actionLabel: "Revocar Approval",
      actionType: "revoke",
    });
  } else if (r.riskScore >= 40) {
    msgs.push({
      id: "risk",
      text: `VEREDICTO: Riesgo MEDIO (${r.riskScore}/100). El contrato tiene características que merecen vigilancia — no son necesariamente maliciosas, pero podrían explotarse. Por ejemplo, los proxies upgradeables son legítimos pero permiten cambios de lógica, y la falta de verificación impide auditoría pública. Recomiendo no dar approvals ilimitados y monitorear el contrato.`,
      type: "risk",
    });
    msgs.push({
      id: "action",
      text: "Te sugiero agregar este contrato a tu lista de monitoreo. Si el comportamiento cambia (por ejemplo, si se upgradea el proxy o si aparece en listas negras), recibirás una alerta inmediata.",
      type: "action",
      actionLabel: "Agregar a Monitoreo",
      actionType: "monitor",
    });
  } else {
    msgs.push({
      id: "risk",
      text: `VEREDICTO: Riesgo BAJO (${r.riskScore}/100). El análisis estático del bytecode no reveló patrones maliciosos conocidos. No se detectaron opcodes destructivos, funciones ocultas ni trampas de honeypot.${ai?.available ? "" : " Dicho esto, el análisis estático tiene limitaciones — no puede detectar lógica maliciosa compleja ni vulnerabilidades de reentrancia."} Siempre haz tu propia investigación (DYOR).`,
      type: "risk",
    });
    msgs.push({
      id: "action",
      text: "No se requiere acción inmediata. El contrato opera dentro de parámetros normales.",
      type: "info",
    });
  }

  return msgs;
}

/* ─── Typing dots component ─── */

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="inline-block h-1.5 w-1.5 rounded-full bg-[#3a6fff]"
          style={{
            animation: "cw-pulse 1.2s ease-in-out infinite",
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
    </div>
  );
}

/* ─── Single AI chat bubble ─── */

function AgentBubble({
  msg,
  onAction,
  actionPending,
  actionDone,
}: {
  msg: AgentMessage;
  onAction?: () => void;
  actionPending: boolean;
  actionDone: boolean;
}) {
  const borderColor =
    msg.type === "risk"
      ? "border-rose-500/30"
      : msg.type === "action"
        ? "border-[#8b5cf6]/30"
        : msg.type === "success"
          ? "border-emerald-500/30"
          : "border-[#3a6fff]/20";

  const iconBg =
    msg.type === "risk"
      ? "from-rose-500/20 to-rose-500/5"
      : msg.type === "action"
        ? "from-[#8b5cf6]/20 to-[#8b5cf6]/5"
        : msg.type === "success"
          ? "from-emerald-500/20 to-emerald-500/5"
          : "from-[#3a6fff]/20 to-[#3a6fff]/5";

  return (
    <div className={`cw-slide-up flex gap-3`}>
      <div
        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-b ${iconBg}`}
      >
        <span className="text-xs">🛡️</span>
      </div>
      <div className="min-w-0 flex-1">
        <div
          className={`rounded-xl border ${borderColor} bg-white/[0.03] px-4 py-3 text-sm leading-relaxed text-[#cfe0ff]`}
        >
          {msg.text}
        </div>

        {msg.actionLabel && msg.actionType === "revoke" && (
          <div className="mt-2.5">
            {actionDone ? (
              <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8.5L6.5 12L13 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Revocación enviada
              </div>
            ) : (
              <button
                type="button"
                onClick={onAction}
                disabled={actionPending}
                className="group relative inline-flex items-center gap-2 overflow-hidden rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-300 transition-all hover:border-rose-500/60 hover:bg-rose-500/20 disabled:opacity-50"
              >
                {actionPending ? (
                  <>
                    <span className="cw-spin inline-block h-3.5 w-3.5 rounded-full border-2 border-rose-300/30 border-t-rose-300" />
                    Firmando en MetaMask…
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    {msg.actionLabel}
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {msg.actionLabel && msg.actionType === "monitor" && (
          <div className="mt-2.5">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-300 transition-all hover:border-amber-500/50 hover:bg-amber-500/20"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5"/>
                <circle cx="7" cy="7" r="2" fill="currentColor"/>
              </svg>
              {msg.actionLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── AI Agent panel ─── */

function AISecurityAgent({
  result,
  contractAddress,
}: {
  result: ContractAuditResult;
  contractAddress: string;
}) {
  const { address, isConnected, walletClient } = useLeaked();
  const [visibleCount, setVisibleCount] = useState(0);
  const [isTyping, setIsTyping] = useState(true);
  const [revokeDone, setRevokeDone] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const messages = useMemo(() => buildAgentMessages(result), [result]);

  const { sendTransaction, data: txHash, isPending: txPending } = useSendTransaction();

  const { isSuccess: txConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  useEffect(() => {
    if (txConfirmed) setRevokeDone(true);
  }, [txConfirmed]);

  useEffect(() => {
    setVisibleCount(0);
    setIsTyping(true);
    setRevokeDone(false);
  }, [result]);

  useEffect(() => {
    if (visibleCount >= messages.length) {
      setIsTyping(false);
      return;
    }
    const delay = visibleCount === 0 ? 800 : visibleCount <= 2 ? 1200 + Math.random() * 400 : 700 + Math.random() * 300;
    const timer = setTimeout(() => setVisibleCount((c) => c + 1), delay);
    return () => clearTimeout(timer);
  }, [visibleCount, messages.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [visibleCount, isTyping]);

  const handleRevoke = useCallback(() => {
    if (!isConnected || !walletClient || !address) return;

    const data = encodeFunctionData({
      abi: parseAbi(["function approve(address spender, uint256 amount)"]),
      functionName: "approve",
      args: [contractAddress as `0x${string}`, 0n],
    });

    sendTransaction({
      to: contractAddress as `0x${string}`,
      data,
      value: 0n,
    });
  }, [isConnected, walletClient, address, contractAddress, sendTransaction]);

  return (
    <div className="cw-card overflow-hidden">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#3a6fff]/20 to-[#8b5cf6]/20">
          <span className="text-base">🤖</span>
        </div>
        <div>
          <h3 className="cw-display text-sm font-semibold text-white">
            AI Security Agent
          </h3>
          <p className="text-[11px] text-[#6f88b9]">
            {result.ai?.available
              ? "Powered by Claude · Análisis profundo con IA"
              : "Análisis heurístico en tiempo real"}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span className="text-[10px] font-medium uppercase tracking-wider text-emerald-400">
            Activo
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {messages.slice(0, visibleCount).map((msg) => (
          <AgentBubble
            key={msg.id}
            msg={msg}
            onAction={msg.actionType === "revoke" ? handleRevoke : undefined}
            actionPending={txPending}
            actionDone={revokeDone}
          />
        ))}
        {isTyping && visibleCount < messages.length && <TypingIndicator />}

        {revokeDone && txHash && (
          <div className="cw-slide-up flex gap-3">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-emerald-500/20 to-emerald-500/5">
              <span className="text-xs">🛡️</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] px-4 py-3 text-sm leading-relaxed text-emerald-300">
                Transacción de revocación enviada exitosamente.
                {monadExplorerUrl && (
                  <>
                    {" "}
                    <a
                      href={`${monadExplorerUrl}/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium underline underline-offset-2 hover:text-emerald-200"
                    >
                      Ver en explorador →
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

/* ─── Main view ─── */

export function ContractAuditorView() {
  const [contractAddress, setContractAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ContractAuditResult | null>(null);

  const canAnalyze = useMemo(() => isAddress(contractAddress.trim()), [contractAddress]);

  async function runAnalysis() {
    setLoading(true);
    setError(null);

    try {
      const next = await analyzeContractAddress(contractAddress);
      setResult(next);
    } catch (err) {
      setResult(null);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const onChain = result?.onChain;
  const isOnChain = onChain?.registered === true;

  return (
    <div className="cw-slide-up space-y-4">
      <div className="cw-card">
        <h2 className="cw-display text-lg text-white">Contract Auditor</h2>
        <p className="mt-1 text-sm text-[#94a3b8]">
          Analiza contratos en Monad. Si el riesgo es alto (&ge;70), el score se registra automáticamente en AlertOracle.
        </p>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            className="cw-input"
            value={contractAddress}
            onChange={(e) => setContractAddress(e.target.value)}
            placeholder="0x… dirección del contrato"
            autoComplete="off"
            onKeyDown={(e) => e.key === "Enter" && canAnalyze && runAnalysis()}
          />
          <button
            type="button"
            className="cw-btn shrink-0"
            onClick={runAnalysis}
            disabled={loading || !canAnalyze}
          >
            {loading ? "Analizando…" : "Analizar"}
          </button>
        </div>

        {!canAnalyze && contractAddress.trim() !== "" && (
          <p className="mt-2 text-xs text-amber-300">La dirección no tiene formato válido.</p>
        )}
      </div>

      {error && (
        <StatusBanner
          tone="danger"
          title="Error al analizar contrato"
          description={error}
        />
      )}

      {result && (
        <>
          <div className="cw-card">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="cw-section-label">Contrato analizado</div>
                <a
                  href={monadExplorerUrl ? `${monadExplorerUrl}/address/${result.contractAddress}` : "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 block break-all font-mono text-sm text-[#3a6fff] hover:underline"
                >
                  {result.contractAddress}
                </a>
                {result.isBlacklisted && (
                  <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                    EN LISTA NEGRA
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="cw-section-label">Risk score</div>
                <div className={`cw-display mt-1 text-4xl ${scoreTone(result.riskScore)}`}>
                  {result.riskScore}
                  <span className="text-base text-[#6f88b9]">/100</span>
                </div>
                <div className="mt-1 text-xs text-[#94a3b8]">
                  {riskLabelFromVerdict(result.verdict)}
                </div>
              </div>
            </div>

            {/* Score bar */}
            <div className="mt-4">
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full transition-[width] duration-700 ease-out"
                  style={{
                    width: `${result.riskScore}%`,
                    background: scoreBarColor(result.riskScore)
                  }}
                />
              </div>
            </div>

            {/* Verification status */}
            {result.verification && (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
                  result.verification.isVerified === true
                    ? "bg-emerald-500/10 text-emerald-400"
                    : result.verification.isVerified === false
                      ? "bg-amber-500/10 text-amber-400"
                      : "bg-white/5 text-[#6f88b9]"
                }`}>
                  {result.verification.isVerified === true && "✓ "}
                  {result.verification.isVerified === true
                    ? "Código verificado"
                    : result.verification.isVerified === false
                      ? "Código NO verificado"
                      : "Verificación desconocida"}
                </div>
                {result.verification.source !== "unknown" && (
                  <span className="text-xs text-[#6f88b9]">
                    vía {result.verification.source}
                  </span>
                )}
                {result.verification.compilerVersion && (
                  <span className="text-xs text-[#6f88b9]">
                    · Solidity {result.verification.compilerVersion}
                  </span>
                )}
              </div>
            )}

            {/* Bytecode info */}
            {result.bytecode && (
              <div className="mt-4 grid gap-3 sm:grid-cols-4 lg:grid-cols-5">
                <BytecodeChip label="Tamaño" value={`${result.bytecode.size} bytes`} />
                <BytecodeChip label="Proxy" value={result.bytecode.isProxy ? "Sí" : "No"} warn={result.bytecode.isProxy} />
                <BytecodeChip label="SELFDESTRUCT" value={result.bytecode.hasSelfdestruct ? "Sí" : "No"} warn={result.bytecode.hasSelfdestruct} />
                <BytecodeChip label="DELEGATECALL" value={result.bytecode.hasDelegatecall ? "Sí" : "No"} warn={result.bytecode.hasDelegatecall} />
                {result.bytecode.hasHiddenMint && (
                  <BytecodeChip label="Hidden Mint" value="Detectado" warn />
                )}
                {result.bytecode.hasHiddenFee && (
                  <BytecodeChip label="Hidden Fee" value="Detectado" warn />
                )}
                {result.bytecode.hasSuspiciousTransfer && (
                  <BytecodeChip label="Honeypot" value="Posible" warn />
                )}
              </div>
            )}
          </div>

          {/* Flags */}
          <div className="cw-card">
            <div className="cw-section-label">Señales de riesgo</div>
            {result.flags.length === 0 ? (
              <p className="mt-2 text-sm text-emerald-300">
                Sin flags de riesgo detectadas.
              </p>
            ) : (
              <ul className="mt-3 space-y-1.5">
                {result.flags.map((flag, i) => {
                  const isPositive = flag.startsWith("✓");
                  const isWarning = flag.startsWith("⚠️");
                  return (
                    <li
                      key={i}
                      className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${
                        isPositive
                          ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-300"
                          : isWarning
                            ? "border-red-500/20 bg-red-500/5 text-red-300"
                            : "border-white/5 bg-white/[0.02] text-[#cfe0ff]"
                      }`}
                    >
                      {!isPositive && !isWarning && (
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-300" />
                      )}
                      <span>{flag}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Recommendations */}
          {result.recommendations && result.recommendations.length > 0 && (
            <div className="cw-card">
              <div className="cw-section-label">Recomendaciones</div>
              <ul className="mt-3 space-y-2">
                {result.recommendations.map((rec, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-[#94a3b8]"
                  >
                    <span className="mt-1 text-[#3a6fff]">→</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* AI Security Agent */}
          <AISecurityAgent result={result} contractAddress={contractAddress} />

          {/* On-chain status */}
          {isOnChain && onChain.txHash && (
            <StatusBanner
              tone="success"
              title="Score registrado en AlertOracle"
              description={`Riesgo alto detectado (${result.riskScore}/100). El servidor registró el score automáticamente en Monad.`}
              actions={
                monadExplorerUrl
                  ? [
                      {
                        label: "Ver transacción",
                        onClick: () =>
                          window.open(
                            `${monadExplorerUrl}/tx/${onChain.txHash}`,
                            "_blank",
                            "noopener,noreferrer"
                          ),
                        variant: "primary"
                      }
                    ]
                  : undefined
              }
            />
          )}

          {result.riskScore >= 70 && !isOnChain && (
            <StatusBanner
              tone="warning"
              title="Riesgo alto — registro on-chain pendiente"
              description="El servidor intentará registrar el score en AlertOracle automáticamente."
            />
          )}
        </>
      )}
    </div>
  );
}

function BytecodeChip({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2.5 text-center">
      <div className="text-[10px] font-medium uppercase tracking-widest text-[#4a6090]">{label}</div>
      <div className={`mt-0.5 text-xs font-semibold ${warn ? "text-amber-300" : "text-[#cfe0ff]"}`}>
        {value}
      </div>
    </div>
  );
}
