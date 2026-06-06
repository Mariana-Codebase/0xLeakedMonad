"use client";

import Link from "next/link";
import { type FormEvent, useCallback, useState } from "react";
import { fetchBreachData, type BreachDashboardData } from "../../lib/breachDashboard";
import { appEnv } from "../../lib/env";
import { DashboardWalletChip } from "./DashboardWalletChip";
import { BreachScannerView } from "./BreachScannerView";
import { ContractAuditorView } from "./ContractAuditorView";
import { RemediationHubView } from "./RemediationHubView";
import { AlertsView } from "./AlertsView";
import { WalletPanel } from "../WalletPanel";
import { ModulePlaceholder } from "./ModulePlaceholder";
import { useLeaked } from "../../lib/useChainWatch";
import "./dashboard.css";

export type DashboardModule =
  | "home"
  | "breach-scanner"
  | "contract-auditor"
  | "remediation-hub"
  | "alerts"
  | "config";

type Props = {
  initialModule?: DashboardModule;
};

type NavItem = {
  id: DashboardModule;
  label: string;
  icon: React.ReactNode;
  enabled: boolean;
};

export function LeakedDashboard({ initialModule = "home" }: Props) {
  const { address: walletAddress } = useLeaked();
  const [activeModule, setActiveModule] = useState<DashboardModule>(initialModule);
  const [target, setTarget] = useState("");
  const [targetType, setTargetType] = useState<"email" | "phone" | "wallet">("email");
  const [data, setData] = useState<BreachDashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const enabledModules = new Set(appEnv.enabledModules);
  const navItems: NavItem[] = [
    { id: "home", label: "Inicio", icon: <HomeIcon />, enabled: true },
    {
      id: "breach-scanner",
      label: "Breach Scanner",
      icon: <ScanIcon />,
      enabled: enabledModules.has("breach-scanner")
    },
    {
      id: "contract-auditor",
      label: "Contract Auditor",
      icon: <AuditIcon />,
      enabled: enabledModules.has("contract-auditor")
    },
    {
      id: "remediation-hub",
      label: "Remediation Hub",
      icon: <ShieldIcon />,
      enabled: enabledModules.has("remediation-hub")
    },
    { id: "alerts", label: "Alertas", icon: <BellIcon />, enabled: true },
    { id: "config", label: "Config", icon: <CogIcon />, enabled: false }
  ];

  const handleSearch = useCallback(async () => {
    const trimmed = target.trim();
    if (!trimmed) return;

    setActiveModule("breach-scanner");
    setLoading(true);
    setSearched(true);
    setError(null);
    setData(null);

    try {
      const result = await fetchBreachData(trimmed, targetType, walletAddress ?? undefined);
      setData(result);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [target, targetType, walletAddress]);

  function onSubmitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void handleSearch();
  }

  function renderScanForm() {
    return (
      <form onSubmit={onSubmitSearch} className="flex flex-col gap-2 sm:flex-row">
        <input
          className="cw-input"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="Email, teléfono o wallet…"
          type="text"
          autoComplete="off"
        />
        <select
          className="cw-select"
          value={targetType}
          onChange={(e) => setTargetType(e.target.value as typeof targetType)}
        >
          <option value="email">Email</option>
          <option value="phone">Teléfono</option>
          <option value="wallet">Wallet</option>
        </select>
        <button className="cw-btn shrink-0" type="submit" disabled={loading}>
          {loading ? "Escaneando…" : "Escanear"}
        </button>
      </form>
    );
  }

  function renderMain() {
    switch (activeModule) {
      case "breach-scanner":
        return (
          <div className="space-y-4">
            <div className="cw-card">
              <h2 className="cw-display text-lg text-white">Escáner de brechas</h2>
              <p className="mt-1 text-sm text-[#94a3b8]">
                Ingresa un objetivo para consultar filtraciones en HIBP.
              </p>
              <div className="mt-4">{renderScanForm()}</div>
            </div>
            <BreachScannerView
              data={data}
              loading={loading}
              error={error}
              searched={searched}
              onDataUpdate={setData}
            />
          </div>
        );

      case "contract-auditor":
        return <ContractAuditorView />;

      case "remediation-hub":
        return <RemediationHubView />;

      case "alerts":
        return <AlertsView />;

      case "config":
        return (
          <ModulePlaceholder
            icon={<CogIcon className="h-7 w-7" />}
            title="Configuración"
            description="Preferencias de red, módulos habilitados y claves de API."
          />
        );

      case "home":
      default:
        return (
          <div className="cw-slide-up grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="cw-card lg:col-span-2">
              <h2 className="cw-display text-2xl text-white">Bienvenida a 0xLeaked</h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#94a3b8]">
                Plataforma de seguridad Web3 que verifica exposición de datos, audita contratos inteligentes
                y resguarda fondos on-chain. <strong className="text-white">Sin bases de datos</strong> — todo opera con tu wallet y smart contracts en Monad.
              </p>
              <div className="mt-5">{renderScanForm()}</div>

              {/* Módulos explicados */}
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => setActiveModule("breach-scanner")}
                  className="group rounded-xl border border-white/10 bg-white/[0.02] p-4 text-left transition-all hover:border-[#3a6fff]/30 hover:bg-white/[0.04]"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400">
                    <ScanIcon className="h-4 w-4" />
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-white">Breach Scanner</h3>
                  <p className="mt-1 text-xs text-[#94a3b8] leading-relaxed">
                    Consulta Have I Been Pwned (+700M cuentas) con k-anonimato. Registra evidencia on-chain con firma EIP-712.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveModule("contract-auditor")}
                  className="group rounded-xl border border-white/10 bg-white/[0.02] p-4 text-left transition-all hover:border-[#3a6fff]/30 hover:bg-white/[0.04]"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
                    <AuditIcon className="h-4 w-4" />
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-white">Contract Auditor</h3>
                  <p className="mt-1 text-xs text-[#94a3b8] leading-relaxed">
                    Analiza bytecode de contratos en Monad vía Alchemy RPC. Detecta patrones de riesgo y funciones peligrosas.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveModule("remediation-hub")}
                  className="group rounded-xl border border-white/10 bg-white/[0.02] p-4 text-left transition-all hover:border-[#3a6fff]/30 hover:bg-white/[0.04]"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                    <ShieldIcon className="h-4 w-4" />
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-white">Remediation Hub</h3>
                  <p className="mt-1 text-xs text-[#94a3b8] leading-relaxed">
                    Vault on-chain (smart contract). Conecta MetaMask → deposita MON → solo tú puedes retirar. Sin custodia.
                  </p>
                </button>
              </div>

              {/* Cómo funciona el vault */}
              <div className="mt-4 rounded-xl border border-[#3a6fff]/15 bg-[#3a6fff]/[0.03] p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#3a6fff]">¿Cómo funciona el vault?</p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#94a3b8]">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#f6851b]" />
                    Conecta wallet
                  </span>
                  <span className="text-[#4a6090]">→</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#3a6fff]" />
                    Deposita MON
                  </span>
                  <span className="text-[#4a6090]">→</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#8b5cf6]" />
                    Smart contract
                  </span>
                  <span className="text-[#4a6090]">→</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Solo tú retiras
                  </span>
                </div>
              </div>

              {data && (
                <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3">
                  <p className="cw-section-label">Último escaneo</p>
                  <p className="mt-1 text-sm text-white">{data.target}</p>
                  <p className="text-sm text-[#94a3b8]">
                    Riesgo {data.riskLevel} · {data.breaches.length} brechas
                  </p>
                </div>
              )}
            </div>

            <div className="lg:col-span-1">
              <WalletPanel />
            </div>
          </div>
        );
    }
  }

  const activeLabel =
    navItems.find((n) => n.id === activeModule)?.label ?? "Inicio";

  return (
    <div className="cw-dashboard">
      <BackgroundDecor />

      <div className="relative z-[1] flex min-h-screen flex-col">
        <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-white/5 bg-[#05070f]/85 px-4 py-3 backdrop-blur-xl md:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="group flex items-center gap-2.5 transition-opacity hover:opacity-80"
              title="Volver al inicio"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#3a6fff] to-[#1e40af]">
                <ShieldGlyph className="h-4 w-4 text-white" />
              </span>
              <span className="cw-display text-base font-medium tracking-tight text-white">
                0xLeaked
              </span>
            </Link>
            <span className="hidden text-xs text-[#6f88b9] sm:inline">/ {activeLabel}</span>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <Link href="/" className="cw-btn-ghost hidden sm:inline-flex items-center gap-1.5">
              <ArrowLeft className="h-3 w-3" />
              Landing
            </Link>
            <DashboardWalletChip />
          </div>
        </header>

        <div className="flex flex-1">
          <aside className="hidden w-56 shrink-0 flex-col gap-0.5 border-r border-white/5 px-3 py-5 md:flex">
            <div className="cw-section-label mb-2 px-3">Módulos</div>
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`cw-nav-item${activeModule === item.id ? " active" : ""}${!item.enabled ? " disabled" : ""}`}
                onClick={() => item.enabled && setActiveModule(item.id)}
                title={item.enabled ? item.label : "Próximamente"}
              >
                <span className="cw-nav-icon">{item.icon}</span>
                <span>{item.label}</span>
                {!item.enabled && (
                  <span className="ml-auto rounded-full border border-white/10 bg-white/5 px-1.5 py-px text-[9px] uppercase tracking-wider text-[#6f88b9]">
                    soon
                  </span>
                )}
              </button>
            ))}
          </aside>

          {/* Tabs móviles */}
          <nav className="flex w-full gap-1 overflow-x-auto border-b border-white/5 bg-[#05070f]/80 px-3 py-2 md:hidden">
            {navItems
              .filter((n) => n.enabled)
              .map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveModule(item.id)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors ${
                    activeModule === item.id
                      ? "border-white/25 bg-white/10 text-white"
                      : "border-white/10 bg-white/[0.03] text-[#94a3b8]"
                  }`}
                >
                  <span className="cw-nav-icon h-3.5 w-3.5">{item.icon}</span>
                  {item.label}
                </button>
              ))}
          </nav>

          <main className="flex-1 overflow-x-hidden p-4 md:p-6">
            <div className="mx-auto max-w-[1400px]">{renderMain()}</div>
          </main>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-white/5 bg-[#05070f]/80 px-4 py-3 text-xs text-[#6f88b9] backdrop-blur-xl md:px-6">
          <span>Protege tu identidad. Asegura tus activos.</span>
          <span className="text-[#3a6fff]">Powered by Monad</span>
        </footer>
      </div>
    </div>
  );
}

function BackgroundDecor() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div
        className="absolute inset-x-0 top-0 h-[500px]"
        style={{
          background:
            "radial-gradient(700px 400px at 50% 0%, rgba(58,111,255,0.14), transparent 70%)"
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(94,170,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(94,170,255,0.08) 1px, transparent 1px)",
          backgroundSize: "64px 64px"
        }}
      />
    </div>
  );
}

/* ============ ICONS ============ */
function ShieldGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M12 2.5 4 5.5v6c0 4.5 3.2 8.5 8 10 4.8-1.5 8-5.5 8-10v-6l-8-3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="m8.5 12 2.5 2.5 4.5-5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden width="18" height="18">
      <path
        d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1v-8.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ScanIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden width="18" height="18">
      <path
        d="M3 7V5a2 2 0 0 1 2-2h2M21 7V5a2 2 0 0 0-2-2h-2M3 17v2a2 2 0 0 0 2 2h2M21 17v2a2 2 0 0 1-2 2h-2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path d="M3 12h18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function AuditIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden width="18" height="18">
      <path
        d="M8 3h7l5 5v13a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M14 3v6h6" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path
        d="m10 14 2 2 4-4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden width="18" height="18">
      <path
        d="M12 2.5 4 5.5v6c0 4.5 3.2 8.5 8 10 4.8-1.5 8-5.5 8-10v-6l-8-3Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="m8.5 12 2.5 2.5 4.5-5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden width="18" height="18">
      <path
        d="M5.5 17h13l-1.6-2.4A2 2 0 0 1 16.5 13V9a4.5 4.5 0 0 0-9 0v4a2 2 0 0 1-.4 1.6L5.5 17ZM10 20a2 2 0 0 0 4 0"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CogIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden width="18" height="18">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M19.4 13.5a8 8 0 0 0 0-3l2-1.6-2-3.4-2.4.8a8 8 0 0 0-2.6-1.5L14 2h-4l-.4 2.8a8 8 0 0 0-2.6 1.5l-2.4-.8-2 3.4 2 1.6a8 8 0 0 0 0 3l-2 1.6 2 3.4 2.4-.8a8 8 0 0 0 2.6 1.5l.4 2.8h4l.4-2.8a8 8 0 0 0 2.6-1.5l2.4.8 2-3.4-2-1.6Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowLeft({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M19 12H5M11 18l-6-6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
