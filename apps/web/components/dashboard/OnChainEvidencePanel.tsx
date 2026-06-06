"use client";

import { useState } from "react";
import type { BreachDashboardData, BreachRecord } from "../../lib/breachDashboard";

type Props = {
  data: BreachDashboardData;
  explorerBaseUrl?: string;
  onRegister?: () => Promise<void>;
  registering?: boolean;
};

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function translateDataClass(dc: string): string {
  const map: Record<string, string> = {
    "Email addresses": "Correos",
    "Passwords": "Contraseñas",
    "Usernames": "Nombres de usuario",
    "Phone numbers": "Teléfonos",
    "IP addresses": "Direcciones IP",
    "Physical addresses": "Direcciones físicas",
    "Dates of birth": "Fechas de nacimiento",
    "Credit cards": "Tarjetas de crédito",
    "Social security numbers": "Números de seguro social",
    "Names": "Nombres",
    "Genders": "Géneros",
    "Geographic locations": "Ubicaciones",
    "Job titles": "Cargos laborales",
    "Employers": "Empleadores",
    "Credit status information": "Info crediticia",
    "Government issued IDs": "IDs gubernamentales",
    "Password hints": "Pistas de contraseña",
    "Security questions and answers": "Preguntas de seguridad",
    "Browser user agent details": "Datos de navegador",
    "Auth tokens": "Tokens de autenticación",
    "Biometric data": "Datos biométricos",
    "Chat logs": "Registros de chat",
    "Device information": "Info de dispositivo",
    "Education levels": "Nivel educativo",
    "Family members' names": "Nombres familiares",
    "Financial investments": "Inversiones",
    "Income levels": "Niveles de ingreso",
    "Nationalities": "Nacionalidades",
    "Occupations": "Ocupaciones",
    "Partial credit card data": "Datos parciales de tarjeta",
    "Purchases": "Compras",
    "Races": "Raza/Etnia",
    "Religions": "Religiones",
    "Time zones": "Zonas horarias",
  };
  return map[dc] ?? dc;
}

type PrivacyLevel = "hash_only" | "company_visible" | "full_visible";

const PRIVACY_OPTIONS: { value: PrivacyLevel; label: string; desc: string }[] = [
  {
    value: "hash_only",
    label: "Solo hash",
    desc: "Solo el hash criptográfico queda en la evidencia. Nadie puede saber tu email."
  },
  {
    value: "company_visible",
    label: "Mostrar compañías",
    desc: "Se muestran las compañías afectadas y los datos comprometidos, pero tu email permanece como hash."
  },
  {
    value: "full_visible",
    label: "Evidencia completa",
    desc: "Tu email y toda la información de las brechas son visibles en el certificado público."
  }
];

export function OnChainEvidencePanel({ data, explorerBaseUrl, onRegister, registering }: Props) {
  const [privacyLevel, setPrivacyLevel] = useState<PrivacyLevel>("company_visible");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const onChain = data.evidence?.onChain;
  const isRegistered = onChain?.registered === true;
  const txHash = onChain?.txHash;
  const blockNumber = onChain?.blockNumber;
  const explorerUrl = explorerBaseUrl ?? "https://testnet.monadexplorer.com";

  if (!data.leaked || !data.evidence) return null;

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const topBreaches = [...data.breaches]
    .sort((a, b) => (b.pwnCount ?? 0) - (a.pwnCount ?? 0))
    .slice(0, 5);

  const allDataClasses = Array.from(
    new Set(data.breaches.flatMap((b) => b.dataClasses ?? []))
  );

  const totalAffected = data.breaches.reduce((acc, b) => acc + (b.pwnCount ?? 0), 0);

  return (
    <div className="mt-4 rounded-xl border border-white/10 bg-[#0c1425] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-white/5 px-5 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#3a6fff]/10">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 1L2 4v4c0 3.5 2.5 6.4 6 7 3.5-.6 6-3.5 6-7V4L8 1z" stroke="#3a6fff" strokeWidth="1.5" fill="none" />
            <path d="M6 8l1.5 1.5L10.5 6" stroke="#3a6fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-white">Evidencia On-Chain</h3>
          <p className="text-xs text-[#6f88b9]">
            {isRegistered ? "Registrada en Monad Testnet" : "Pendiente de registro"}
          </p>
        </div>
        {isRegistered ? (
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 cw-dot-live" />
            On-chain
          </span>
        ) : onRegister ? (
          <button
            type="button"
            onClick={onRegister}
            disabled={registering}
            className="flex items-center gap-1.5 rounded-full bg-[#3a6fff]/10 px-3 py-1.5 text-[11px] font-medium text-[#3a6fff] hover:bg-[#3a6fff]/20 transition-colors disabled:opacity-50"
          >
            {registering ? (
              <>
                <span className="h-3 w-3 animate-spin rounded-full border border-[#3a6fff]/30 border-t-[#3a6fff]" />
                Registrando…
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <path d="M8 1L2 4v4c0 3.5 2.5 6.4 6 7 3.5-.6 6-3.5 6-7V4L8 1z" stroke="currentColor" strokeWidth="1.5" fill="none" />
                </svg>
                Registrar on-chain
              </>
            )}
          </button>
        ) : null}
      </div>

      {/* On-chain proof */}
      {isRegistered && txHash && (
        <div className="border-b border-white/5 px-5 py-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 text-[10px] font-medium uppercase tracking-widest text-[#4a6090]">
                Transaction Hash
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(txHash, "tx")}
                className="group flex items-center gap-1.5 text-left"
              >
                <span className="font-mono text-xs text-[#cfe0ff]">
                  {txHash.slice(0, 14)}…{txHash.slice(-10)}
                </span>
                <span className="text-[10px] text-[#4a6090] opacity-0 transition-opacity group-hover:opacity-100">
                  {copiedField === "tx" ? "✓" : "copiar"}
                </span>
              </button>
            </div>
            <div>
              <div className="mb-1 text-[10px] font-medium uppercase tracking-widest text-[#4a6090]">
                Bloque
              </div>
              <span className="font-mono text-xs text-[#cfe0ff]">#{blockNumber}</span>
            </div>
            <div>
              <div className="mb-1 text-[10px] font-medium uppercase tracking-widest text-[#4a6090]">
                Target Hash (keccak256)
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(data.targetHash ?? "", "hash")}
                className="group flex items-center gap-1.5 text-left"
              >
                <span className="font-mono text-xs text-[#cfe0ff]">
                  {(data.targetHash ?? "").slice(0, 14)}…{(data.targetHash ?? "").slice(-10)}
                </span>
                <span className="text-[10px] text-[#4a6090] opacity-0 transition-opacity group-hover:opacity-100">
                  {copiedField === "hash" ? "✓" : "copiar"}
                </span>
              </button>
            </div>
            <div>
              <div className="mb-1 text-[10px] font-medium uppercase tracking-widest text-[#4a6090]">
                Explorer
              </div>
              <a
                href={`${explorerUrl}/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-[#3a6fff] hover:underline"
              >
                Ver en MonadExplorer
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                  <path d="M3.5 2h6.5v6.5M9.5 2.5L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Privacy control */}
      <div className="border-b border-white/5 px-5 py-4">
        <div className="mb-3 flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="#6f88b9" strokeWidth="1.2" fill="none" />
            <path d="M5 7V5a3 3 0 016 0v2" stroke="#6f88b9" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          </svg>
          <span className="text-xs font-semibold text-[#cfe0ff]">Control de privacidad</span>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {PRIVACY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setPrivacyLevel(opt.value)}
              className={`rounded-lg border p-3 text-left transition-all ${
                privacyLevel === opt.value
                  ? "border-[#3a6fff]/50 bg-[#3a6fff]/5"
                  : "border-white/5 bg-white/[0.02] hover:border-white/10"
              }`}
            >
              <div className={`text-xs font-semibold ${privacyLevel === opt.value ? "text-[#3a6fff]" : "text-[#cfe0ff]"}`}>
                {opt.label}
              </div>
              <div className="mt-1 text-[11px] leading-snug text-[#6f88b9]">{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Evidence certificate */}
      <div className="px-5 py-4">
        <div className="mb-3 text-[10px] font-medium uppercase tracking-widest text-[#4a6090]">
          Certificado de evidencia
        </div>

        {/* Target info based on privacy level */}
        <div className="mb-4 rounded-lg border border-white/5 bg-white/[0.02] p-4">
          <div className="mb-2 text-[10px] font-medium uppercase tracking-widest text-[#4a6090]">
            Identidad afectada
          </div>
          {privacyLevel === "full_visible" ? (
            <div>
              <div className="font-mono text-sm text-white">{data.target}</div>
              <div className="mt-1 text-[11px] text-[#6f88b9]">
                Tipo: {data.targetType} · Hash: {(data.targetHash ?? "").slice(0, 10)}…
              </div>
            </div>
          ) : (
            <div>
              <div className="font-mono text-sm text-[#cfe0ff]">
                {(data.targetHash ?? "").slice(0, 18)}…{(data.targetHash ?? "").slice(-12)}
              </div>
              <div className="mt-1 text-[11px] text-[#6f88b9]">
                Solo hash keccak256 · Tu {data.targetType} no es visible
              </div>
            </div>
          )}
        </div>

        {/* Breach details based on privacy level */}
        {privacyLevel !== "hash_only" && (
          <>
            {/* Summary stats */}
            <div className="mb-4 grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3 text-center">
                <div className="text-lg font-bold text-white">{data.breaches.length}</div>
                <div className="text-[10px] text-[#6f88b9]">Brechas</div>
              </div>
              <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3 text-center">
                <div className="text-lg font-bold text-white">{formatNumber(totalAffected)}</div>
                <div className="text-[10px] text-[#6f88b9]">Cuentas afectadas</div>
              </div>
              <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3 text-center">
                <div className="text-lg font-bold text-white">{allDataClasses.length}</div>
                <div className="text-[10px] text-[#6f88b9]">Tipos de datos</div>
              </div>
            </div>

            {/* Top breaches by company */}
            <div className="mb-4">
              <div className="mb-2 text-[10px] font-medium uppercase tracking-widest text-[#4a6090]">
                Compañías afectadas (top {topBreaches.length})
              </div>
              <div className="space-y-2">
                {topBreaches.map((b) => (
                  <BreachCompanyRow key={b.name} breach={b} />
                ))}
              </div>
            </div>

            {/* Compromised data types */}
            <div>
              <div className="mb-2 text-[10px] font-medium uppercase tracking-widest text-[#4a6090]">
                Datos comprometidos
              </div>
              <div className="flex flex-wrap gap-1.5">
                {allDataClasses.map((dc) => {
                  const isSensitive = ["Passwords", "Credit cards", "Social security numbers", "Auth tokens", "Biometric data"].includes(dc);
                  return (
                    <span
                      key={dc}
                      className={`rounded-md px-2 py-0.5 text-[11px] ${
                        isSensitive
                          ? "border border-red-500/20 bg-red-500/10 text-red-300"
                          : "border border-white/5 bg-white/[0.03] text-[#94a3b8]"
                      }`}
                    >
                      {translateDataClass(dc)}
                    </span>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {privacyLevel === "hash_only" && (
          <p className="text-xs leading-relaxed text-[#6f88b9]">
            En modo &ldquo;Solo hash&rdquo;, únicamente el hash criptográfico de tu identidad queda registrado. 
            Nadie puede determinar tu email, teléfono o wallet a partir del hash. 
            La evidencia on-chain demuestra que una filtración fue verificada, pero no revela quién fue afectado.
          </p>
        )}
      </div>
    </div>
  );
}

function BreachCompanyRow({ breach }: { breach: BreachRecord }) {
  const [expanded, setExpanded] = useState(false);
  const dataClasses = breach.dataClasses ?? [];
  const year = breach.breachDate?.split("-")[0] ?? "—";
  const isSensitive = breach.isSensitive ?? false;

  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-white/[0.02] transition-colors"
      >
        {breach.logoPath && (
          <img
            src={breach.logoPath}
            alt=""
            className="h-6 w-6 rounded object-contain bg-white/5 p-0.5"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">{breach.title}</span>
            {isSensitive && (
              <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-[9px] font-medium text-red-400">
                SENSIBLE
              </span>
            )}
            {breach.isVerified && (
              <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-medium text-emerald-400">
                VERIFICADA
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-[#6f88b9]">
            <span>{year}</span>
            {breach.domain && <span>· {breach.domain}</span>}
            {breach.pwnCount ? <span>· {formatNumber(breach.pwnCount)} cuentas</span> : null}
          </div>
        </div>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          className={`shrink-0 text-[#4a6090] transition-transform ${expanded ? "rotate-180" : ""}`}
        >
          <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-white/5 px-3 py-3 space-y-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <div className="text-[10px] font-medium uppercase tracking-widest text-[#4a6090]">Fecha de brecha</div>
              <div className="mt-0.5 text-xs text-[#cfe0ff]">{breach.breachDate}</div>
            </div>
            {breach.addedDate && (
              <div>
                <div className="text-[10px] font-medium uppercase tracking-widest text-[#4a6090]">Reportada</div>
                <div className="mt-0.5 text-xs text-[#cfe0ff]">{breach.addedDate.split("T")[0]}</div>
              </div>
            )}
          </div>

          {dataClasses.length > 0 && (
            <div>
              <div className="mb-1 text-[10px] font-medium uppercase tracking-widest text-[#4a6090]">
                Datos expuestos en esta brecha
              </div>
              <div className="flex flex-wrap gap-1">
                {dataClasses.map((dc) => {
                  const critical = ["Passwords", "Credit cards", "Social security numbers", "Auth tokens"].includes(dc);
                  return (
                    <span
                      key={dc}
                      className={`rounded px-1.5 py-0.5 text-[10px] ${
                        critical
                          ? "bg-red-500/10 text-red-300"
                          : "bg-white/[0.04] text-[#94a3b8]"
                      }`}
                    >
                      {translateDataClass(dc)}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
