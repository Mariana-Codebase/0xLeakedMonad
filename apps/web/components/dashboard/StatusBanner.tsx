"use client";

import type { ReactNode } from "react";

export type StatusTone = "info" | "warning" | "danger" | "success" | "neutral";

export type StatusAction = {
  label: string;
  onClick: () => void;
  variant?: "primary" | "ghost";
};

type Props = {
  tone?: StatusTone;
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  actions?: StatusAction[];
  extra?: ReactNode;
  dense?: boolean;
};

const TONE_STYLES: Record<
  StatusTone,
  { ring: string; bg: string; iconBg: string; text: string; pill: string }
> = {
  info: {
    ring: "border-[#3a6fff]/35",
    bg: "bg-gradient-to-r from-[#0a1730]/90 to-[#0a1730]/60",
    iconBg: "bg-[#3a6fff]/20 text-[#a8c7ff]",
    text: "text-[#cfe0ff]",
    pill: "bg-[#3a6fff]/15 text-[#a8c7ff] border-[#3a6fff]/30"
  },
  warning: {
    ring: "border-amber-400/40",
    bg: "bg-gradient-to-r from-[#1a1305]/90 to-[#0a1730]/60",
    iconBg: "bg-amber-500/20 text-amber-200",
    text: "text-amber-50",
    pill: "bg-amber-500/15 text-amber-300 border-amber-400/30"
  },
  danger: {
    ring: "border-rose-400/45",
    bg: "bg-gradient-to-r from-[#1a050a]/90 to-[#0a1730]/60",
    iconBg: "bg-rose-500/20 text-rose-200",
    text: "text-rose-50",
    pill: "bg-rose-500/15 text-rose-300 border-rose-400/30"
  },
  success: {
    ring: "border-emerald-400/45",
    bg: "bg-gradient-to-r from-[#051a0e]/90 to-[#0a1730]/60",
    iconBg: "bg-emerald-500/20 text-emerald-200",
    text: "text-emerald-50",
    pill: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30"
  },
  neutral: {
    ring: "border-white/10",
    bg: "bg-[#0a1228]/85",
    iconBg: "bg-white/5 text-[#a8b8d6]",
    text: "text-[#cfe0ff]",
    pill: "bg-white/5 text-[#a8b8d6] border-white/10"
  }
};

const DEFAULT_ICON: Record<StatusTone, string> = {
  info: "ⓘ",
  warning: "⚠",
  danger: "✕",
  success: "✓",
  neutral: "•"
};

export function StatusBanner({
  tone = "info",
  title,
  description,
  icon,
  actions,
  extra,
  dense = false
}: Props) {
  const t = TONE_STYLES[tone];
  return (
    <div
      className={`relative overflow-hidden rounded-xl border ${t.ring} ${t.bg} ${dense ? "px-3 py-2" : "px-4 py-3"} backdrop-blur-md`}
      role={tone === "danger" || tone === "warning" ? "alert" : "status"}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${t.iconBg} text-base font-bold`}
        >
          {icon ?? DEFAULT_ICON[tone]}
        </div>
        <div className="min-w-0 flex-1">
          <div className={`text-sm font-semibold ${t.text}`}>{title}</div>
          {description && (
            <div className="mt-0.5 text-[12px] leading-relaxed text-[#a8b8d6]">
              {description}
            </div>
          )}
          {extra && <div className="mt-2">{extra}</div>}
        </div>
        {actions && actions.length > 0 && (
          <div className="flex shrink-0 items-center gap-2">
            {actions.map((a) => (
              <button
                key={a.label}
                type="button"
                onClick={a.onClick}
                className={
                  a.variant === "primary"
                    ? `rounded-md border ${t.pill} px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.15em] transition-colors hover:bg-white/[0.06]`
                    : "rounded-md border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-[#cfe0ff] transition-colors hover:border-white/25 hover:bg-white/[0.07]"
                }
              >
                {a.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
