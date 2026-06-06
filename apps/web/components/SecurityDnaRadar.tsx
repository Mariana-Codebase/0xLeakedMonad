"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer
} from "recharts";

export interface RadarData {
  breachExposure: number;
  privacyExposure: number;
  reputationRisk: number;
  dataVolume: number;
  threatLevel: number;
  remediationUrgency: number;
}

export type ScanResponseForRadar = {
  leaked: boolean;
  breaches?: Array<{
    name: string;
    breachDate: string;
    dataClasses?: string[];
    PwnCount?: number;
  }>;
};

export interface SecurityDnaRadarProps {
  data: RadarData;
  isLoading?: boolean;
  animated?: boolean;
  /** Número real de brechas (si no se pasa, se estima desde breachExposure). */
  breachCount?: number;
}

const AXIS_LABELS: Array<{ key: keyof RadarData; label: string }> = [
  { key: "breachExposure", label: "Brechas" },
  { key: "privacyExposure", label: "Privacidad" },
  { key: "reputationRisk", label: "Reputación" },
  { key: "dataVolume", label: "Volumen" },
  { key: "threatLevel", label: "Amenaza" },
  { key: "remediationUrgency", label: "Urgencia" }
];

function ageScoreForBreach(breachDate: string): number {
  const parsed = new Date(breachDate);
  if (Number.isNaN(parsed.getTime())) return 50;
  const years =
    (Date.now() - parsed.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  if (years < 1) return 90;
  if (years < 3) return 70;
  if (years < 5) return 50;
  return 30;
}

function scoreDataVolume(pwnCount: number | undefined): number {
  if (pwnCount === undefined || pwnCount <= 0) return 20;
  if (pwnCount > 100_000_000) return 95;
  if (pwnCount > 10_000_000) return 80;
  if (pwnCount > 1_000_000) return 60;
  if (pwnCount > 100_000) return 40;
  return 20;
}

function scorePrivacyFromClasses(classes: Set<string>): number {
  let score = 0;
  const has = (patterns: string[]) =>
    [...classes].some((c) => {
      const lower = c.toLowerCase();
      return patterns.some((p) => lower.includes(p));
    });

  if (has(["password", "hash"])) score += 25;
  if (has(["email"])) score += 15;
  if (has(["phone"])) score += 15;
  if (has(["financial", "credit", "bank", "payment", "card"])) score += 30;
  if (has(["address", "physical"])) score += 10;
  if (has(["social"])) score += 10;

  return Math.min(100, score);
}

export function computeRadarDataFromScan(scan: ScanResponseForRadar): RadarData {
  const breaches = scan.breaches ?? [];

  const breachExposure = Math.min(100, breaches.length * 8);

  const allClasses = new Set<string>();
  for (const breach of breaches) {
    for (const dc of breach.dataClasses ?? []) {
      allClasses.add(dc);
    }
  }
  const privacyExposure = scorePrivacyFromClasses(allClasses);

  const reputationRisk =
    breaches.length > 0
      ? Math.round(
          breaches.reduce((sum, b) => sum + ageScoreForBreach(b.breachDate), 0) /
            breaches.length
        )
      : 0;

  const pwnCounts = breaches
    .map((b) => b.PwnCount)
    .filter((n): n is number => typeof n === "number" && n > 0);
  const maxPwn = pwnCounts.length > 0 ? Math.max(...pwnCounts) : undefined;
  const dataVolume = scoreDataVolume(maxPwn);

  const threatLevel = Math.round(
    (breachExposure + privacyExposure + reputationRisk) / 3
  );

  let remediationUrgency = 0;
  if (scan.leaked) {
    if (threatLevel > 70) remediationUrgency = 90;
    else if (threatLevel > 40) remediationUrgency = 60;
    else remediationUrgency = 30;
  }

  return {
    breachExposure,
    privacyExposure,
    reputationRisk,
    dataVolume,
    threatLevel,
    remediationUrgency
  };
}

function threatColor(threatLevel: number): string {
  if (threatLevel <= 30) return "#22c55e";
  if (threatLevel <= 60) return "#f59e0b";
  if (threatLevel <= 80) return "#f97316";
  return "#ef4444";
}

function threatGlowClass(threatLevel: number): string {
  if (threatLevel <= 30) return "radar-glow-green";
  if (threatLevel <= 60) return "radar-glow-yellow";
  if (threatLevel <= 80) return "radar-glow-orange";
  return "radar-glow-red";
}

function urgencyLabel(urgency: number): string {
  if (urgency >= 80) return "Crítica";
  if (urgency >= 55) return "Alta";
  if (urgency >= 25) return "Media";
  return "Baja";
}

const PLACEHOLDER_DATA: RadarData = {
  breachExposure: 50,
  privacyExposure: 50,
  reputationRisk: 50,
  dataVolume: 50,
  threatLevel: 50,
  remediationUrgency: 50
};

const EMPTY_SAFE_DATA: RadarData = {
  breachExposure: 5,
  privacyExposure: 5,
  reputationRisk: 5,
  dataVolume: 5,
  threatLevel: 5,
  remediationUrgency: 0
};

export function emptySafeRadarData(): RadarData {
  return { ...EMPTY_SAFE_DATA };
}

function toChartRows(data: RadarData) {
  return AXIS_LABELS.map(({ key, label }) => ({
    metric: label,
    value: data[key]
  }));
}

export function SecurityDnaRadar({
  data,
  isLoading = false,
  animated = true,
  breachCount
}: SecurityDnaRadarProps) {
  const displayData = isLoading ? PLACEHOLDER_DATA : data;
  const color = threatColor(displayData.threatLevel);
  const glowClass = threatGlowClass(displayData.threatLevel);
  const chartData = toChartRows(displayData);

  return (
    <div className="flex w-full flex-col items-center">
      <div
        className={`relative w-[280px] h-[280px] md:w-[400px] md:h-[400px] ${isLoading ? "animate-pulse" : ""}`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="72%" data={chartData}>
            <PolarGrid stroke="#334155" strokeOpacity={0.6} />
            <PolarAngleAxis
              dataKey="metric"
              tick={{ fill: "#94a3b8", fontSize: 11 }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={false}
              axisLine={false}
            />
            <Radar
              name="Security DNA"
              dataKey="value"
              stroke={color}
              fill={color}
              fillOpacity={0.25}
              strokeWidth={2}
              className={glowClass}
              isAnimationActive={animated && !isLoading}
            />
          </RadarChart>
        </ResponsiveContainer>

        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-slate-950/40 backdrop-blur-[1px]">
            <span className="text-sm font-medium text-cw-muted">Analizando...</span>
          </div>
        )}
      </div>

      {!isLoading && (
        <div className="mt-4 grid w-full max-w-md grid-cols-3 gap-3 text-center">
          <div className="rounded-lg border border-cw-border bg-slate-950/60 px-2 py-2">
            <p className="text-xs text-cw-muted">Score general</p>
            <p className="text-lg font-semibold" style={{ color }}>
              {displayData.threatLevel}/100
            </p>
          </div>
          <div className="rounded-lg border border-cw-border bg-slate-950/60 px-2 py-2">
            <p className="text-xs text-cw-muted">Brechas</p>
            <p className="text-lg font-semibold text-cw-text">
              {breachCount ?? Math.round(displayData.breachExposure / 8)}
            </p>
          </div>
          <div className="rounded-lg border border-cw-border bg-slate-950/60 px-2 py-2">
            <p className="text-xs text-cw-muted">Urgencia</p>
            <p className="text-lg font-semibold text-cw-text">
              {urgencyLabel(displayData.remediationUrgency)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
