"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { StatusBanner } from "./StatusBanner";
import { useRealtimeEvents, type OnChainEventData } from "../../lib/useRealtimeEvents";

const gatewayUrl = process.env.NEXT_PUBLIC_API_GATEWAY_URL ?? "http://localhost:4000";
const explorerUrl = process.env.NEXT_PUBLIC_MONAD_EXPLORER_URL ?? "https://testnet.monadexplorer.com";

type OnChainEvent = {
  id: string;
  eventName: string;
  contract: string;
  txHash: string;
  blockNumber: string;
  args: Record<string, unknown>;
  indexedAt: string;
};

type FilterType = "all" | "breach" | "score" | "vault";

const EVENT_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  BreachRecorded: {
    label: "Brecha registrada",
    color: "#3a6fff",
    icon: <ShieldIcon className="h-4 w-4" />
  },
  ScoreUpdated: {
    label: "Score actualizado",
    color: "#8b5cf6",
    icon: <ChartIcon className="h-4 w-4" />
  },
  NativeDeposited: {
    label: "Depósito en vault",
    color: "#10b981",
    icon: <VaultIcon className="h-4 w-4" />
  },
  NativeWithdrawn: {
    label: "Retiro de vault",
    color: "#f59e0b",
    icon: <VaultIcon className="h-4 w-4" />
  },
  VerifierSet: {
    label: "Verifier configurado",
    color: "#6366f1",
    icon: <KeyIcon className="h-4 w-4" />
  }
};

export function AlertsView() {
  const [events, setEvents] = useState<OnChainEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [useWebSocket, setUseWebSocket] = useState(true);

  const { status: wsStatus, lastEvent } = useRealtimeEvents({
    enabled: useWebSocket,
    onEvent: (event) => {
      if (event.type === "onchain_event") {
        const data = event.data as OnChainEventData;
        setEvents((prev) => {
          const exists = prev.some((e) => e.id === data.id);
          if (exists) return prev;
          return [{
            ...data,
            indexedAt: event.timestamp
          }, ...prev].slice(0, 100);
        });
      }
    }
  });

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch(`${gatewayUrl}/api/events/recent?limit=50`);
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      setEvents(data.events ?? []);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    if (useWebSocket) return;
    const interval = setInterval(fetchEvents, 15000);
    return () => clearInterval(interval);
  }, [useWebSocket, fetchEvents]);

  const filteredEvents = events.filter((ev) => {
    if (filter === "all") return true;
    if (filter === "breach") return ev.eventName === "BreachRecorded";
    if (filter === "score") return ev.eventName === "ScoreUpdated";
    if (filter === "vault") return ev.eventName.includes("Native");
    return true;
  });

  const stats = {
    total: events.length,
    breaches: events.filter((e) => e.eventName === "BreachRecorded").length,
    scores: events.filter((e) => e.eventName === "ScoreUpdated").length,
    vault: events.filter((e) => e.eventName.includes("Native")).length
  };

  return (
    <div className="cw-slide-up space-y-4">
      {/* Header */}
      <div className="cw-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="cw-display text-lg text-white">Centro de Alertas</h2>
            <p className="mt-1 text-sm text-[#94a3b8]">
              Monitoreo en tiempo real de eventos on-chain en Monad Testnet.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setUseWebSocket(!useWebSocket)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                wsStatus === "connected"
                  ? "bg-emerald-500/10 text-emerald-400"
                  : wsStatus === "connecting"
                    ? "bg-amber-500/10 text-amber-400"
                    : "bg-white/5 text-[#6f88b9] hover:bg-white/10"
              }`}
            >
              {wsStatus === "connected" ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]" />
                  Realtime ON
                </>
              ) : wsStatus === "connecting" ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.4)]" />
                  Conectando…
                </>
              ) : (
                <>
                  <span className="h-2 w-2 rounded-full bg-[#6f88b9]" />
                  Realtime OFF
                </>
              )}
            </button>
            <button
              type="button"
              onClick={fetchEvents}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs font-medium text-[#cfe0ff] transition-colors hover:bg-white/10 disabled:opacity-50"
            >
              <RefreshIcon className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Actualizar
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-4 gap-3">
          <StatBadge label="Total" value={stats.total} color="#fff" />
          <StatBadge label="Brechas" value={stats.breaches} color="#3a6fff" />
          <StatBadge label="Scores" value={stats.scores} color="#8b5cf6" />
          <StatBadge label="Vault" value={stats.vault} color="#10b981" />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {(["all", "breach", "score", "vault"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === f
                ? "bg-[#3a6fff]/10 text-[#3a6fff]"
                : "bg-white/5 text-[#6f88b9] hover:bg-white/10 hover:text-[#cfe0ff]"
            }`}
          >
            {f === "all" && "Todos"}
            {f === "breach" && "Brechas"}
            {f === "score" && "Scores"}
            {f === "vault" && "Vault"}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <StatusBanner
          tone="danger"
          title="Error al cargar eventos"
          description={error}
        />
      )}

      {/* Events list */}
      <div className="space-y-2">
        {loading && events.length === 0 ? (
          <div className="cw-card flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-[#3a6fff]" />
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="cw-card flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 text-[#6f88b9]">
              <BellIcon className="h-6 w-6" />
            </div>
            <p className="mt-3 text-sm text-[#94a3b8]">No hay eventos registrados todavía.</p>
            <p className="mt-1 text-xs text-[#6f88b9]">
              Los eventos aparecerán aquí cuando se registren en los contratos.
            </p>
          </div>
        ) : (
          filteredEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))
        )}
      </div>
    </div>
  );
}

function EventCard({ event }: { event: OnChainEvent }) {
  const config = EVENT_CONFIG[event.eventName] ?? {
    label: event.eventName,
    color: "#6f88b9",
    icon: <BellIcon className="h-4 w-4" />
  };

  const shortTx = event.txHash.slice(0, 10) + "…" + event.txHash.slice(-8);
  const timeAgo = formatDistanceToNow(new Date(event.indexedAt), { addSuffix: true, locale: es });

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 transition-all hover:border-white/15 hover:bg-white/[0.03]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
            style={{ background: `${config.color}15`, color: config.color }}
          >
            {config.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-white">{config.label}</span>
              <span className="text-xs text-[#6f88b9]">{timeAgo}</span>
            </div>
            <a
              href={`${explorerUrl}/tx/${event.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 block font-mono text-xs text-[#3a6fff] hover:underline"
            >
              {shortTx}
            </a>
            {/* Event-specific details */}
            <EventDetails event={event} />
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-[#6f88b9]">Bloque</div>
          <div className="font-mono text-xs text-[#cfe0ff]">#{event.blockNumber}</div>
        </div>
      </div>
    </div>
  );
}

function EventDetails({ event }: { event: OnChainEvent }) {
  const args = event.args;
  
  if (event.eventName === "BreachRecorded") {
    const source = args.source ? String(args.source) : null;
    const dataType = args.dataType ? String(args.dataType) : null;
    return (
      <div className="mt-2 flex flex-wrap gap-2">
        {source && (
          <span className="rounded bg-white/5 px-2 py-0.5 text-[10px] text-[#94a3b8]">
            Fuente: {source}
          </span>
        )}
        {dataType && (
          <span className="rounded bg-white/5 px-2 py-0.5 text-[10px] text-[#94a3b8]">
            Tipo: {dataType}
          </span>
        )}
      </div>
    );
  }

  if (event.eventName === "ScoreUpdated") {
    const score = Number(args.score ?? 0);
    const scoreColor = score >= 70 ? "#ef4444" : score >= 40 ? "#f59e0b" : "#10b981";
    const label = args.label ? String(args.label).toUpperCase() : null;
    return (
      <div className="mt-2 flex items-center gap-2">
        <span className="rounded px-2 py-0.5 text-xs font-medium" style={{ background: `${scoreColor}20`, color: scoreColor }}>
          Score: {score}/100
        </span>
        {label && (
          <span className="rounded bg-white/5 px-2 py-0.5 text-[10px] text-[#94a3b8]">
            {label}
          </span>
        )}
      </div>
    );
  }

  return null;
}

function StatBadge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-center">
      <div className="text-lg font-bold" style={{ color }}>{value}</div>
      <div className="text-[10px] text-[#6f88b9]">{label}</div>
    </div>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M12 2L4 6v6c0 5.5 3.5 10 8 11 4.5-1 8-5.5 8-11V6l-8-4z" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M18 20V10M12 20V4M6 20v-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function VaultIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="8" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M7 8V6a5 5 0 0110 0v2" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function KeyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <circle cx="8" cy="15" r="4" stroke="currentColor" strokeWidth="2" />
      <path d="M11 12l10-10M16 7l3-3M19 4l2 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M1 4v6h6M23 20v-6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
