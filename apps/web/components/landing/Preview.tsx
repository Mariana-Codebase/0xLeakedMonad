"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const FALLBACK_TICKER = [
  { time: "LIVE", text: "Brecha detectada · LinkedIn 2021 · 700M afectados", tone: "text-rose-300" },
  { time: "LIVE", text: "Evidencia registrada · tx 0xaf3…b21", tone: "text-emerald-300" },
  { time: "LIVE", text: "Contrato analizado · Score 23/100 · Bajo riesgo", tone: "text-sky-300" },
  { time: "LIVE", text: "Vault deposit · +0.5 MON", tone: "text-amber-300" },
  { time: "LIVE", text: "Score alto detectado · 0xbe…ad1 → 85/100", tone: "text-rose-300" }
];

const gatewayUrl = process.env.NEXT_PUBLIC_API_GATEWAY_URL ?? "http://localhost:4000";

type TickerItem = { time: string; text: string; tone: string };

function eventToTicker(ev: { eventName: string; txHash: string; args: Record<string, unknown> }): TickerItem {
  const shortTx = ev.txHash.slice(0, 6) + "…" + ev.txHash.slice(-4);
  const shortAddr = (s: string) => s.slice(0, 6) + "…" + s.slice(-4);

  switch (ev.eventName) {
    case "BreachRecorded":
      return { time: "LIVE", text: `Brecha registrada · tx ${shortTx}`, tone: "text-emerald-300" };
    case "ScoreUpdated":
      return {
        time: "LIVE",
        text: `Score actualizado · ${shortAddr(String(ev.args.contractAddress ?? ""))} → ${ev.args.score ?? "?"}/100`,
        tone: Number(ev.args.score ?? 0) >= 70 ? "text-rose-300" : "text-sky-300"
      };
    case "NativeDeposited":
      return { time: "LIVE", text: `Vault +MON · ${shortAddr(String(ev.args.user ?? ""))}`, tone: "text-sky-300" };
    case "NativeWithdrawn":
      return { time: "LIVE", text: `Vault retiro · ${shortAddr(String(ev.args.user ?? ""))}`, tone: "text-amber-300" };
    default:
      return { time: "LIVE", text: `${ev.eventName} · tx ${shortTx}`, tone: "text-violet-300" };
  }
}

function useLiveTicker(): TickerItem[] {
  const [items, setItems] = useState<TickerItem[]>(FALLBACK_TICKER);

  useEffect(() => {
    let cancelled = false;
    fetch(`${gatewayUrl}/api/events/recent`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.events?.length) return;
        const live = (data.events as Array<{ eventName: string; txHash: string; args: Record<string, unknown> }>)
          .slice(0, 10)
          .map(eventToTicker);
        setItems(live.length >= 3 ? live : [...live, ...FALLBACK_TICKER.slice(0, 5 - live.length)]);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return items;
}

export function Preview() {
  const TICKER = useLiveTicker();

  return (
    <section id="plataforma" className="relative py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <div className="cw-reveal mx-auto max-w-2xl text-center mb-12">
          <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-[#7f9bc9]">
            <span className="h-px w-8 bg-gradient-to-r from-transparent to-[#7f9bc9]/70" />
            Plataforma
            <span className="h-px w-8 bg-gradient-to-l from-transparent to-[#7f9bc9]/70" />
          </span>
          <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-white md:text-4xl">
            Todo en un solo lugar
          </h2>
          <p className="mt-4 text-lg text-[#94a3b8]">
            Dashboard unificado para escanear, auditar y proteger.
          </p>
        </div>

        {/* Browser mockup */}
        <div className="cw-reveal relative">
          <div className="absolute -inset-4 rounded-3xl bg-gradient-to-tr from-[#3a6fff]/15 via-transparent to-[#8b5cf6]/15 blur-2xl" />

          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0a0f1c]/95 shadow-2xl backdrop-blur-xl">
            {/* Browser header */}
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-[#ff5f56]" />
                <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
                <span className="h-3 w-3 rounded-full bg-[#27c93f]" />
                <span className="ml-4 rounded-md bg-white/5 px-3 py-1 font-mono text-[11px] text-[#7f9bc9]">
                  0xleaked.app/platform
                </span>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-300">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                live
              </span>
            </div>

            {/* Activity ticker */}
            <div className="cw-ticker-mask relative overflow-hidden border-b border-white/5 bg-white/[0.015] py-2">
              <div className="cw-ticker px-5 font-mono text-[11px]">
                {[...TICKER, ...TICKER].map((t, i) => (
                  <span key={i} className="inline-flex shrink-0 items-center gap-2 text-[#7f9bc9]">
                    <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-white/40">{t.time}</span>
                    <span className={t.tone}>›</span>
                    <span className="text-[#cfe0ff]/80">{t.text}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Mock dashboard content */}
            <div className="p-6 md:p-8">
              <div className="grid gap-6 md:grid-cols-3">
                {/* Breach Scanner mock */}
                <MockCard
                  title="Breach Scanner"
                  icon={<ScanIcon className="h-4 w-4" />}
                  color="#3a6fff"
                  stat="2 brechas"
                  statLabel="detectadas"
                />
                
                {/* Contract Auditor mock */}
                <MockCard
                  title="Contract Auditor"
                  icon={<AuditIcon className="h-4 w-4" />}
                  color="#8b5cf6"
                  stat="23/100"
                  statLabel="risk score"
                />
                
                {/* Vault mock */}
                <MockCard
                  title="Remediation Hub"
                  icon={<VaultIcon className="h-4 w-4" />}
                  color="#10b981"
                  stat="0.52 MON"
                  statLabel="en vault"
                />
              </div>

              {/* CTA */}
              <div className="mt-8 text-center">
                <Link
                  href="/platform"
                  className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#3a6fff] to-[#8b5cf6] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#3a6fff]/20 transition-all hover:shadow-xl hover:shadow-[#3a6fff]/30"
                >
                  Probar ahora
                  <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function MockCard({
  title,
  icon,
  color,
  stat,
  statLabel
}: {
  title: string;
  icon: React.ReactNode;
  color: string;
  stat: string;
  statLabel: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 transition-all hover:border-white/20 hover:bg-white/[0.04]">
      <div className="flex items-center gap-3 mb-4">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ background: `${color}15`, color }}
        >
          {icon}
        </div>
        <span className="text-sm font-medium text-white">{title}</span>
      </div>
      <div className="text-2xl font-bold text-white">{stat}</div>
      <div className="text-xs text-[#6f88b9]">{statLabel}</div>
    </div>
  );
}

function ScanIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function AuditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function VaultIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="8" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M7 8V6a5 5 0 0110 0v2" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="14" r="2" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
