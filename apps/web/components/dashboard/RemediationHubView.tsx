"use client";

import { useCallback, useEffect, useState } from "react";
import { type Address, formatEther, parseEther, type Hex } from "viem";
import { usePublicClient } from "wagmi";
import { remediationVaultAbi } from "@0xleaked/abi";
import { useLeaked } from "../../lib/useChainWatch";
import { parseMonAmount, remediationSteps } from "../../lib/remediation";
import { StatusBanner } from "./StatusBanner";
import { monadTestnet } from "../../lib/monadChain";

const remediationVaultAddress = process.env.NEXT_PUBLIC_REMEDIATION_VAULT_ADDRESS;
const monadExplorerUrl = process.env.NEXT_PUBLIC_MONAD_EXPLORER_URL;
const gatewayUrl = process.env.NEXT_PUBLIC_API_GATEWAY_URL ?? "http://localhost:4000";

export function RemediationHubView() {
  const [depositAmount, setDepositAmount] = useState("0.05");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [vaultBalance, setVaultBalance] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<{
    message: string;
    tone: "info" | "success" | "danger";
  } | null>(null);
  const [txHash, setTxHash] = useState<Hex | "">("");
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState<"deposit" | "withdraw">("deposit");

  const { address, walletClient, walletReadinessError, isConnected, isMonadNetwork, switchToMonad } =
    useLeaked();
  const publicClient = usePublicClient();

  const fetchBalance = useCallback(async () => {
    if (!address || !remediationVaultAddress) return;
    try {
      const res = await fetch(`${gatewayUrl}/api/remediation/vault/balance/${address}`);
      if (res.ok) {
        const data = await res.json();
        setVaultBalance(data.nativeBalance ?? data.balance ?? "0");
      }
    } catch {
      /* silent */
    }
  }, [address]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  async function handleDeposit() {
    const parsed = parseMonAmount(depositAmount);
    if (parsed <= 0) {
      setTxStatus({ message: "Ingresa un monto válido mayor a 0.", tone: "danger" });
      return;
    }

    const readiness = walletReadinessError(remediationVaultAddress);
    if (readiness) {
      setTxStatus({ message: readiness.hint ?? readiness.message, tone: "danger" });
      return;
    }
    if (!walletClient) {
      setTxStatus({ message: "Wallet no disponible.", tone: "danger" });
      return;
    }

    try {
      setBusy(true);
      setTxStatus({ message: "Abriendo wallet para depositar…", tone: "info" });
      const hash = await walletClient.writeContract({
        address: remediationVaultAddress as Address,
        abi: remediationVaultAbi,
        functionName: "depositNative",
        args: [],
        value: parseEther(String(parsed)),
        account: address as Address,
        chain: monadTestnet,
        gas: 150_000n
      });
      setTxHash(hash);
      setTxStatus({ message: "Esperando confirmación…", tone: "info" });

      if (publicClient) {
        const receipt = await publicClient.waitForTransactionReceipt({
          hash,
          confirmations: 1,
          timeout: 120_000
        });
        if (receipt.status === "reverted") {
          setTxStatus({ message: "La transacción fue revertida por el contrato.", tone: "danger" });
        } else {
          setTxStatus({ message: `Depósito de ${parsed} MON confirmado.`, tone: "success" });
          fetchBalance();
        }
      } else {
        setTxStatus({ message: "Tx enviada. Recarga para ver el balance.", tone: "success" });
        setTimeout(fetchBalance, 5000);
      }
    } catch (err) {
      const msg = (err as Error).message;
      const rejected = /reject|denied|user/i.test(msg);
      setTxStatus({
        message: rejected ? "Depósito cancelado." : `Error: ${msg.slice(0, 150)}`,
        tone: rejected ? "info" : "danger"
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleWithdraw() {
    const parsed = parseMonAmount(withdrawAmount);
    if (parsed <= 0) {
      setTxStatus({ message: "Ingresa un monto válido para retirar.", tone: "danger" });
      return;
    }

    const readiness = walletReadinessError(remediationVaultAddress);
    if (readiness) {
      setTxStatus({ message: readiness.hint ?? readiness.message, tone: "danger" });
      return;
    }
    if (!walletClient || !address) {
      setTxStatus({ message: "Wallet no disponible.", tone: "danger" });
      return;
    }

    try {
      setBusy(true);
      setTxStatus({ message: "Abriendo wallet para retirar…", tone: "info" });
      const hash = await walletClient.writeContract({
        address: remediationVaultAddress as Address,
        abi: remediationVaultAbi,
        functionName: "withdrawNative",
        args: [address as Address, parseEther(String(parsed))],
        account: address as Address,
        chain: monadTestnet,
        gas: 150_000n
      });
      setTxHash(hash);
      setTxStatus({ message: "Esperando confirmación del retiro…", tone: "info" });

      if (publicClient) {
        const receipt = await publicClient.waitForTransactionReceipt({
          hash,
          confirmations: 1,
          timeout: 120_000
        });
        if (receipt.status === "reverted") {
          setTxStatus({ message: "Retiro revertido. ¿Tienes suficiente balance en el vault?", tone: "danger" });
        } else {
          setTxStatus({ message: `Retiro de ${parsed} MON confirmado.`, tone: "success" });
          fetchBalance();
        }
      } else {
        setTxStatus({ message: "Tx enviada. Recarga para ver el balance.", tone: "success" });
        setTimeout(fetchBalance, 5000);
      }
    } catch (err) {
      const msg = (err as Error).message;
      const rejected = /reject|denied|user/i.test(msg);
      const insufficientBalance = /InsufficientBalance|insufficient/i.test(msg);
      setTxStatus({
        message: rejected
          ? "Retiro cancelado."
          : insufficientBalance
            ? "No tienes suficiente balance en el vault para retirar esa cantidad."
            : `Error: ${msg.slice(0, 150)}`,
        tone: rejected ? "info" : "danger"
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="cw-slide-up space-y-4">
      {/* Explicación del vault: wallet-only, sin base de datos */}
      <div className="cw-card border-[#3a6fff]/20">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#3a6fff]/10">
            <svg className="h-5 w-5 text-[#3a6fff]" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L4 6v6c0 5.5 3.5 10 8 11 4.5-1 8-5.5 8-11V6l-8-4z" stroke="currentColor" strokeWidth="1.5" />
              <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">100% On-Chain · Sin bases de datos</h3>
            <p className="mt-1 text-sm leading-relaxed text-[#94a3b8]">
              Tus fondos se almacenan directamente en un smart contract en Monad. No usamos bases de datos ni servidores de custodia.
              Solo tú puedes acceder a tu balance con tu wallet.
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { step: "1", label: "Conecta MetaMask", desc: "Tu wallet es tu identidad" },
            { step: "2", label: "Deposita MON", desc: "Fondos van al smart contract" },
            { step: "3", label: "Seguro on-chain", desc: "Registrado en blockchain" },
            { step: "4", label: "Solo tú retiras", desc: "Sin intermediarios" },
          ].map((s) => (
            <div key={s.step} className="rounded-lg border border-white/10 bg-white/[0.02] p-3 text-center">
              <div className="mx-auto flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#3a6fff] to-[#8b5cf6] text-xs font-bold text-white">
                {s.step}
              </div>
              <div className="mt-2 text-xs font-medium text-white">{s.label}</div>
              <div className="mt-0.5 text-[10px] text-[#6f88b9]">{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="cw-card">
        <h2 className="cw-display text-lg text-white">Remediation Hub</h2>
        <p className="mt-1 text-sm text-[#94a3b8]">
          Ruta de mitigación para reducir exposición tras una alerta o brecha.
        </p>

        <div className="mt-5 space-y-2">
          {remediationSteps.map((step, index) => (
            <div
              key={step.id}
              className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span className="cw-display flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/5 text-xs text-[#cfe0ff]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="text-sm font-medium text-white">{step.title}</span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-[#94a3b8]">{step.detail}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="cw-card">
        <div className="flex items-center justify-between">
          <div className="cw-section-label">Bóveda segura (RemediationVault)</div>
          {vaultBalance !== null && (
            <div className="text-right">
              <div className="text-[10px] font-medium uppercase tracking-widest text-[#4a6090]">Tu balance</div>
              <div className="cw-display text-lg text-emerald-300">
                {Number(formatEther(BigInt(vaultBalance))).toFixed(4)} MON
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="mt-4 flex gap-1 rounded-lg border border-white/5 bg-white/[0.02] p-1">
          <button
            type="button"
            onClick={() => setActiveTab("deposit")}
            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === "deposit"
                ? "bg-[#3a6fff]/10 text-[#3a6fff]"
                : "text-[#6f88b9] hover:text-[#cfe0ff]"
            }`}
          >
            Depositar
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("withdraw")}
            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === "withdraw"
                ? "bg-[#3a6fff]/10 text-[#3a6fff]"
                : "text-[#6f88b9] hover:text-[#cfe0ff]"
            }`}
          >
            Retirar
          </button>
        </div>

        {activeTab === "deposit" && (
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              className="cw-input"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="Cantidad en MON"
              inputMode="decimal"
            />
            <button
              type="button"
              className="cw-btn shrink-0"
              onClick={handleDeposit}
              disabled={busy}
            >
              {busy ? "Procesando…" : "Depositar"}
            </button>
          </div>
        )}

        {activeTab === "withdraw" && (
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              className="cw-input"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              placeholder="Cantidad en MON"
              inputMode="decimal"
            />
            <button
              type="button"
              className="cw-btn shrink-0"
              onClick={handleWithdraw}
              disabled={busy}
            >
              {busy ? "Procesando…" : "Retirar"}
            </button>
          </div>
        )}

        <div className="mt-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-xs">
          <span className="text-[#6f88b9]">Vault: </span>
          {remediationVaultAddress ? (
            <a
              href={monadExplorerUrl ? `${monadExplorerUrl}/address/${remediationVaultAddress}` : "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all font-mono text-[#3a6fff] hover:underline"
            >
              {remediationVaultAddress}
            </a>
          ) : (
            <span className="text-amber-300">No configurada</span>
          )}
        </div>

        {!isConnected && (
          <div className="mt-3">
            <StatusBanner tone="info" dense title="Conecta tu wallet para operar con el vault" />
          </div>
        )}

        {isConnected && !isMonadNetwork && (
          <div className="mt-3">
            <StatusBanner
              tone="warning"
              dense
              title="Estás en otra red"
              actions={[{ label: "Cambiar a Monad", onClick: switchToMonad, variant: "primary" }]}
            />
          </div>
        )}

        {txStatus && (
          <div className="mt-3">
            <StatusBanner
              tone={txStatus.tone}
              dense
              title={txStatus.message}
              actions={
                txHash && monadExplorerUrl
                  ? [{
                      label: "Ver transacción",
                      onClick: () => window.open(`${monadExplorerUrl}/tx/${txHash}`, "_blank", "noopener,noreferrer"),
                      variant: "primary"
                    }]
                  : undefined
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}
