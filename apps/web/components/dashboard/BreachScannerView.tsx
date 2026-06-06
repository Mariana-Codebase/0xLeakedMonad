"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip
} from "recharts";
import { RiskRadarChart } from "./RiskRadarChart";
import {
  type BreachDashboardData,
  type BreachRecord,
  fetchBreachData,
  scoreColor,
  stripHtml
} from "../../lib/breachDashboard";
import { useLeaked } from "../../lib/useChainWatch";
import { useAutoRegister } from "../../lib/useAutoRegister";
import { AutoRegisterPanel } from "./AutoRegisterPanel";
import { OnChainEvidencePanel } from "./OnChainEvidencePanel";
import { StatusBanner } from "./StatusBanner";

const breachRegistryAddress =
  process.env.NEXT_PUBLIC_BREACH_REGISTRY_ADDRESS;
const monadExplorerUrl = process.env.NEXT_PUBLIC_MONAD_EXPLORER_URL;

function breachSeverity(dateStr: string): { label: string; color: string } {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return { label: "—", color: "#4a6090" };
  if (d > new Date("2023-01-01")) return { label: "Crítica", color: "#ff4444" };
  if (d > new Date("2020-01-01")) return { label: "Alta", color: "#ff8800" };
  if (d > new Date("2017-01-01")) return { label: "Media", color: "#ffcc00" };
  return { label: "Baja", color: "#44ff88" };
}

type Props = {
  data: BreachDashboardData | null;
  loading: boolean;
  error: string | null;
  searched: boolean;
  onDataUpdate?: (data: BreachDashboardData) => void;
};

const RIGHT_STACK_GAP_PX = 16;
const BREACHES_HEIGHT_OFFSET_PX = 30;

export function BreachScannerView({ data, loading, error, searched, onDataUpdate }: Props) {
  const {
    address,
    isConnected,
    isMonadNetwork,
    metaMaskConnector,
    connect,
    switchToMonad
  } = useLeaked();
  const [selectedBreach, setSelectedBreach] = useState<BreachRecord | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [columnHeight, setColumnHeight] = useState(0);
  const [registering, setRegistering] = useState(false);

  const handleRegisterOnChain = useCallback(async () => {
    if (!data) return;
    setRegistering(true);
    try {
      const updated = await fetchBreachData(
        data.target,
        data.targetType,
        address ?? undefined,
        true
      );
      onDataUpdate?.(updated);
    } catch (err) {
      console.error("Error registrando on-chain:", err);
    } finally {
      setRegistering(false);
    }
  }, [data, address, onDataUpdate]);

  const autoRegister = useAutoRegister({
    contractAddress: breachRegistryAddress,
    data,
    onRetryServerRegister: handleRegisterOnChain
  });

  useEffect(() => {
    const el = sidebarRef.current;
    if (!el) return;

    const measure = () => setColumnHeight(el.getBoundingClientRect().height);
    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [data, searched]);

  useEffect(() => {
    setSelectedBreach(null);
  }, [data?.target]);

  const stackInnerHeight =
    columnHeight > 0 ? columnHeight - RIGHT_STACK_GAP_PX : 0;
  const breachesPanelHeight =
    stackInnerHeight > 0
      ? Math.max(140, Math.floor(stackInnerHeight / 2) - BREACHES_HEIGHT_OFFSET_PX)
      : undefined;
  const scoresPanelHeight =
    stackInnerHeight > 0
      ? Math.max(140, Math.ceil(stackInnerHeight / 2) + BREACHES_HEIGHT_OFFSET_PX)
      : undefined;

  function handleConnectWallet() {
    if (metaMaskConnector) connect({ connector: metaMaskConnector });
  }

  if (!searched && !loading) {
    return (
      <div className="cw-breach-module cw-slide-up flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-2xl border border-white/5 bg-white/[0.02] px-6 py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 text-[#7dd3fc]">
          <ScanGlyph className="h-6 w-6" />
        </div>
        <div className="cw-display text-base text-white">Listo para escanear</div>
        <p className="max-w-md text-sm text-[#94a3b8]">
          Escribe un email, teléfono o wallet arriba para consultar filtraciones en HIBP.
        </p>
        <p className="max-w-md text-xs text-[#6f88b9]">
          El dato se hashea en tu navegador · k-anonimato activo
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="cw-breach-module flex min-h-[40vh] flex-col items-center justify-center gap-4 rounded-2xl border border-white/5 bg-white/[0.02] px-6 py-12">
        <div className="cw-spin h-12 w-12 rounded-full border-[3px] border-white/10 border-t-white" />
        <div className="cw-pulse cw-display text-sm text-white">Consultando HIBP…</div>
        <p className="text-xs text-[#6f88b9]">
          Verificando brechas conocidas · k-anonimato activo
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="cw-breach-module flex min-h-[30vh] flex-col items-center justify-center gap-3 rounded-2xl border border-rose-400/20 bg-rose-500/5 px-6 py-10 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-500/15 text-rose-300">
          <AlertGlyph className="h-5 w-5" />
        </div>
        <div className="cw-display text-sm text-rose-200">Error de conexión</div>
        <p className="max-w-md text-sm text-[#cfe0ff]">{error}</p>
        <p className="text-xs text-[#6f88b9]">
          Verifica que api-gateway (4000) y breach-service (4101) estén activos.
        </p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="cw-breach-module cw-fade-in">
      <div className="cw-card cw-slide-up mb-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
          <svg width="84" height="84" viewBox="0 0 90 90" className="shrink-0">
            <circle cx="45" cy="45" r="38" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7" />
            <circle
              cx="45"
              cy="45"
              r="38"
              fill="none"
              stroke={scoreColor(data.overallScore)}
              strokeWidth="7"
              strokeDasharray={`${(data.overallScore / 100) * 239} 239`}
              strokeLinecap="round"
              transform="rotate(-90 45 45)"
              style={{ filter: `drop-shadow(0 0 6px ${scoreColor(data.overallScore)}88)` }}
            />
            <text
              x="45"
              y="51"
              textAnchor="middle"
              fontSize="22"
              fontWeight="600"
              fill={scoreColor(data.overallScore)}
              fontFamily="Space Grotesk, Inter, sans-serif"
            >
              {data.overallScore}
            </text>
          </svg>

          <div className="min-w-0 flex-1">
            <div className="cw-section-label">Nivel de riesgo general</div>
            <div
              className="cw-display mt-1 text-3xl leading-none md:text-4xl"
              style={{ color: scoreColor(data.overallScore) }}
            >
              {data.riskLevel}
            </div>
            <p className="mt-2 text-sm text-[#94a3b8]">
              {data.breaches.length} brecha{data.breaches.length !== 1 ? "s" : ""} · Confianza{" "}
              {Math.round(data.confidence * 100)}%
            </p>
          </div>
        </div>

      </div>

      {data.leaked && (
        <div className="mb-4">
          <AutoRegisterPanel
            state={autoRegister.state}
            onCancel={autoRegister.cancel}
            onRetry={autoRegister.retry}
            onClaimOwnership={autoRegister.claimOwnership}
            onSwitchNetwork={switchToMonad}
            onConnectWallet={handleConnectWallet}
          />
        </div>
      )}

      {data.leaked && (
        <OnChainEvidencePanel
          data={data}
          explorerBaseUrl={monadExplorerUrl}
          onRegister={handleRegisterOnChain}
          registering={registering}
        />
      )}

      <div className="cw-main-grid">
        <div ref={sidebarRef} className="cw-col-sidebar">
          <div className="cw-card">
            <div className="cw-section-label mb-3">Resumen</div>
            {data.riskSummary.map((r) => (
              <div key={r.label} className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ background: r.color, boxShadow: `0 0 6px ${r.color}` }}
                  />
                  <span className="text-sm text-[#cfe0ff]">{r.label}</span>
                </div>
                <span className="cw-display text-sm" style={{ color: r.color }}>
                  {r.count}
                </span>
              </div>
            ))}
          </div>

          <div className="cw-card">
            <div className="cw-section-label mb-3">Acción recomendada</div>
            {data.actions.map((a, i) => (
              <div key={i} className="cw-action-row">
                <span>{a.icon}</span>
                <span className="flex-1 text-sm text-[#cfe0ff]">{a.text}</span>
                <span className="text-[#3a6fff]">→</span>
              </div>
            ))}
          </div>
        </div>

        <div
          className="cw-card cw-panel-stretch cw-col-radar-fixed"
          style={columnHeight > 0 ? { height: columnHeight } : undefined}
        >
          <div className="mb-3 shrink-0">
            <div className="cw-section-label">Perfil de riesgo (HIBP)</div>
            <p className="mt-1 text-xs text-[#6f88b9]">Más área = más riesgo.</p>
          </div>
          <div className="cw-radar-body">
            <RiskRadarChart axes={data.radarAxes} />
          </div>
        </div>

        <div
          className="cw-col-right-stack"
          style={columnHeight > 0 ? { height: columnHeight } : undefined}
        >
          <div
            className="cw-card cw-col-breaches"
            style={
              breachesPanelHeight
                ? { height: breachesPanelHeight, maxHeight: breachesPanelHeight }
                : undefined
            }
          >
            <div className="mb-3 flex shrink-0 items-center justify-between gap-2">
              <div className="cw-section-label">Brechas</div>
              <span className="text-xs text-[#6f88b9]">{data.breaches.length}</span>
            </div>

            <div className="cw-breaches-body">
            <div className="cw-breach-list">
              {data.alerts.length === 0 ? (
                <p className="text-[13px] text-[#4a6090]">Sin brechas.</p>
              ) : (
                data.alerts.map((a, i) => {
                  const breach = data.breaches[i];
                  const sev = breachSeverity(breach?.breachDate ?? "");
                  const breachYear = (() => {
                    const y = new Date(breach?.breachDate ?? "").getFullYear();
                    return Number.isNaN(y) ? "—" : String(y);
                  })();
                  const isSelected = selectedBreach?.name === a.name;
                  return (
                    <div
                      key={a.name}
                      className={`cw-breach-item${isSelected ? " selected" : ""}`}
                      onClick={() =>
                        setSelectedBreach(isSelected ? null : breach)
                      }
                    >
                      <div
                        className="mt-1 h-2 w-2 shrink-0 rounded-full"
                        style={{ background: sev.color, boxShadow: `0 0 5px ${sev.color}` }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-[13px] font-semibold leading-tight"
                            style={{ color: sev.color }}
                          >
                            {sev.label}
                          </span>
                          <span className="text-[13px] font-bold leading-none text-white">
                            {breachYear}
                          </span>
                        </div>
                        <div className="text-[13px] leading-snug text-[#a8b8d8]">
                          {breach?.title}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            </div>
          </div>

          <div
            className="cw-card cw-col-scores"
            style={
              scoresPanelHeight
                ? { height: scoresPanelHeight, maxHeight: scoresPanelHeight }
                : undefined
            }
          >
            <div className="cw-section-label mb-3 shrink-0">Scores por eje</div>
            <div className="cw-scores-panel">
              {data.radarAxes.map((ax) => (
                <div key={ax.axis} className="cw-score-row">
                  <div className="mb-1 flex justify-between gap-2">
                    <span className="text-sm font-medium text-[#cfe0ff]">
                      {ax.axis.replace("\n", " ")}
                    </span>
                    <span
                      className="cw-display shrink-0 text-sm"
                      style={{ color: scoreColor(ax.value) }}
                    >
                      {ax.value}/100
                    </span>
                  </div>
                  <div className="mb-1 h-[3px] rounded-sm bg-white/5">
                    <div
                      className="h-full rounded-sm"
                      style={{ width: `${ax.value}%`, background: scoreColor(ax.value) }}
                    />
                  </div>
                  <p className="text-xs leading-snug text-[#6f88b9]">{ax.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {selectedBreach && (
        <div className="cw-card cw-breach-detail-full cw-fade-in mt-4">
          <div className="mb-3 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="cw-section-label">Detalle de brecha</div>
              <div className="cw-display mt-1 text-base text-[#fb923c]">
                {selectedBreach.title}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#6f88b9]">
                <span>Fecha: {selectedBreach.breachDate}</span>
                {selectedBreach.domain && <span>· {selectedBreach.domain}</span>}
                {selectedBreach.pwnCount ? (
                  <span>· {selectedBreach.pwnCount.toLocaleString()} cuentas afectadas</span>
                ) : null}
                {selectedBreach.isVerified && (
                  <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-medium text-emerald-400">
                    VERIFICADA
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              className="cw-btn-ghost shrink-0"
              onClick={() => setSelectedBreach(null)}
            >
              Cerrar
            </button>
          </div>

          {(selectedBreach.dataClasses?.length ?? 0) > 0 && (
            <div className="mb-3">
              <div className="mb-1.5 text-[10px] font-medium uppercase tracking-widest text-[#4a6090]">
                Datos expuestos
              </div>
              <div className="flex flex-wrap gap-1.5">
                {selectedBreach.dataClasses!.map((dc) => {
                  const critical = ["Passwords", "Credit cards", "Social security numbers", "Auth tokens"].includes(dc);
                  return (
                    <span
                      key={dc}
                      className={`rounded-md px-2 py-0.5 text-[11px] ${
                        critical
                          ? "border border-red-500/20 bg-red-500/10 text-red-300"
                          : "border border-white/5 bg-white/[0.03] text-[#94a3b8]"
                      }`}
                    >
                      {dc}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          <p className="text-sm leading-relaxed text-[#94a3b8]">
            {stripHtml(selectedBreach.description ?? "")}
          </p>
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="cw-card">
          <div className="cw-section-label mb-1">Evolución de riesgo</div>
          <p className="mb-3 text-xs leading-relaxed text-[#6f88b9]">
            {data.evolutionNote}
          </p>
          <ResponsiveContainer
            width="100%"
            height={data.evolution.length > 12 ? 155 : 125}
          >
            <LineChart data={data.evolution} margin={{ bottom: data.evolution.length > 8 ? 8 : 0 }}>
              <XAxis
                dataKey="date"
                tick={{ fill: "#6f88b9", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                angle={data.evolution.length > 8 ? -45 : 0}
                textAnchor={data.evolution.length > 8 ? "end" : "middle"}
                height={data.evolution.length > 8 ? 52 : 28}
                label={
                  data.evolution.length > 1
                    ? {
                        value: "Año",
                        position: "insideBottom",
                        offset: data.evolution.length > 8 ? -4 : 2,
                        fill: "#6f88b9",
                        fontSize: 12
                      }
                    : undefined
                }
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: "#6f88b9", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={28}
              />
              <Tooltip
                contentStyle={{
                  background: "#0a1228",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                  fontSize: 12
                }}
                labelFormatter={(label) => `Año ${label}`}
                formatter={(value, _name, item) => {
                  const score = typeof value === "number" ? value : 0;
                  const payload = item.payload as { breachCount?: number };
                  return [
                    `${score}/100 · ${payload.breachCount ?? 0} brechas acumuladas`,
                    "Riesgo"
                  ];
                }}
              />
              <defs>
                <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#ff4444" />
                  <stop offset="100%" stopColor="#44ff88" />
                </linearGradient>
              </defs>
              <Line
                type="monotone"
                dataKey="score"
                stroke="url(#lineGrad)"
                strokeWidth={2}
                dot={{ fill: "#ff6600", r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="cw-card">
          <div className="cw-section-label mb-3">Nivel de riesgo</div>

          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
            <span className="text-sm text-[#94a3b8]">Tu posición</span>
            <span
              className="cw-display text-sm"
              style={{ color: scoreColor(data.overallScore) }}
            >
              {data.riskLevel} · {data.overallScore}/100
            </span>
          </div>

          <div className="relative my-7">
            <div
              className="h-3 rounded-full"
              style={{
                background: "linear-gradient(90deg,#44ff88,#ffcc00,#ff8800,#ff4444)"
              }}
            />
            <div
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${data.overallScore}%` }}
              title={`${data.overallScore}/100`}
            >
              <div
                className="h-6 w-[3px] rounded-full"
                style={{
                  background: scoreColor(data.overallScore),
                  boxShadow: `0 0 10px ${scoreColor(data.overallScore)}`
                }}
              />
              <div
                className="cw-display absolute left-1/2 top-7 -translate-x-1/2 whitespace-nowrap text-xs"
                style={{ color: scoreColor(data.overallScore) }}
              >
                ▲ Tú
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-1 text-center">
            {(
              [
                ["0-25", "Bajo", "#44ff88"],
                ["26-50", "Medio", "#ffcc00"],
                ["51-75", "Alto", "#ff8800"],
                ["76-100", "Crítico", "#ff4444"]
              ] as const
            ).map(([range, label, color]) => {
              const inBand =
                (range === "0-25" && data.overallScore <= 25) ||
                (range === "26-50" && data.overallScore >= 26 && data.overallScore <= 50) ||
                (range === "51-75" && data.overallScore >= 51 && data.overallScore <= 75) ||
                (range === "76-100" && data.overallScore >= 76);
              return (
                <div
                  key={range}
                  className={`rounded-md px-1 py-1 ${inBand ? "bg-white/[0.05] ring-1" : ""}`}
                  style={inBand ? { ["--tw-ring-color" as never]: `${color}55` } : undefined}
                >
                  <div className="text-[11px] text-[#6f88b9]">{range}</div>
                  <div className="cw-display text-xs" style={{ color }}>
                    {label}
                  </div>
                </div>
              );
            })}
          </div>
          <div
            className={`mt-4 rounded-lg border px-3 py-2.5 text-sm ${
              data.leaked
                ? "border-rose-400/30 bg-rose-500/10 text-rose-200"
                : "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
            }`}
          >
            {data.leaked
              ? `Tu email aparece en ${data.breaches.length} brecha${data.breaches.length !== 1 ? "s" : ""}. ${data.actions[0]?.text}.`
              : "No se encontraron brechas para este email."}
          </div>
        </div>
      </div>
    </div>
  );
}

function ScanGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
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

function AlertGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M12 3 2.5 20h19L12 3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M12 10v4M12 17.5v.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
