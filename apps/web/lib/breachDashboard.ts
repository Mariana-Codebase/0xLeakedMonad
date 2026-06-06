export type BreachRecord = {
  name: string;
  title: string;
  domain?: string;
  breachDate: string;
  addedDate?: string;
  pwnCount?: number;
  description?: string;
  dataClasses?: string[];
  isVerified?: boolean;
  isSensitive?: boolean;
  logoPath?: string;
};

export type RadarAxis = {
  axis: string;
  value: number;
  fullMark: number;
  /** Qué mide este eje y de dónde sale el valor */
  description: string;
};

export type BreachAlert = {
  title: string;
  sub: string;
  time: string;
  color: string;
  date: string;
  name: string;
};

export type EvolutionPoint = {
  date: string;
  score: number;
  breachCount: number;
};

export type BreachDashboardData = {
  target: string;
  targetType: "email" | "phone" | "wallet";
  overallScore: number;
  riskLevel: string;
  leaked: boolean;
  confidence: number;
  source: string;
  evidenceId?: string;
  targetHash?: string;
  radarAxes: RadarAxis[];
  riskSummary: Array<{ label: string; count: number; color: string }>;
  actions: Array<{ text: string; icon: string }>;
  alerts: BreachAlert[];
  evolution: EvolutionPoint[];
  evolutionNote: string;
  breaches: BreachRecord[];
  evidence?: {
    evidenceId: string;
    targetHash: string;
    source: string;
    recommendation: string;
    onChain?: OnChainEvidence | null;
  };
};

export type OnChainEvidence = {
  registered: boolean;
  txHash?: string;
  blockNumber?: string;
  recordId?: string;
  registryAddress?: string;
  reason?: string;
  code?: string;
};

export type RawScanResponse = {
  ok: boolean;
  leaked: boolean;
  targetType?: "email" | "phone" | "wallet";
  confidence?: number;
  source?: string;
  breaches?: BreachRecord[];
  evidence?: {
    evidenceId: string;
    targetHash: string;
    source: string;
    recommendation: string;
    onChain?: OnChainEvidence | null;
  };
};

const gatewayBaseUrl =
  process.env.NEXT_PUBLIC_API_GATEWAY_URL ?? "http://localhost:4000";

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Hoy";
  if (days === 1) return "Hace 1 día";
  if (days < 30) return `Hace ${days} días`;
  const months = Math.floor(days / 30);
  if (months < 12) return `Hace ${months} mes${months > 1 ? "es" : ""}`;
  return `Hace ${Math.floor(months / 12)} año${Math.floor(months / 12) > 1 ? "s" : ""}`;
}

export function scoreColor(v: number): string {
  if (v >= 76) return "#ff4444";
  if (v >= 51) return "#ff8800";
  if (v >= 26) return "#ffcc00";
  return "#44ff88";
}

export function riskLabel(v: number): string {
  if (v >= 76) return "CRÍTICO";
  if (v >= 51) return "ALTO";
  if (v >= 26) return "MEDIO";
  return "BAJO";
}

/**
 * Convierte cantidad de brechas a 0–100 con escala logarítmica.
 * Así 2 vs 555 brechas se distinguen sin que todo quede pegado en 100.
 * Referencia: ~10 brechas ≈ 50, ~100 ≈ 75, ~500+ ≈ 95+.
 */
export function breachCountRisk(count: number): number {
  if (count <= 0) return 0;
  const normalized = Math.log10(count + 1) / Math.log10(501);
  return Math.min(100, Math.max(5, Math.round(normalized * 100)));
}

/** Promedio de “frescura”: brechas recientes suben el puntaje. */
function recencyRisk(breaches: BreachRecord[]): number {
  if (!breaches.length) return 0;
  const now = Date.now();
  let sum = 0;
  for (const b of breaches) {
    const t = new Date(b.breachDate).getTime();
    if (Number.isNaN(t)) {
      sum += 40;
      continue;
    }
    const ageYears = (now - t) / (365.25 * 86400000);
    sum += Math.max(12, Math.min(100, 100 - ageYears * 8));
  }
  return Math.round(sum / breaches.length);
}

/** % de brechas posteriores a 2023 (ventana “crítica”). */
function criticalDensityRisk(breaches: BreachRecord[]): number {
  if (!breaches.length) return 0;
  const critical = breaches.filter((b) => new Date(b.breachDate) > new Date("2023-01-01")).length;
  return Math.min(100, Math.round((critical / breaches.length) * 100));
}

/** Años distintos con brechas: más superficie expuesta. */
function timelineSpreadRisk(breaches: BreachRecord[]): number {
  const years = new Set(
    breaches
      .map((b) => new Date(b.breachDate).getFullYear())
      .filter((y) => !Number.isNaN(y))
  );
  if (years.size <= 1) return breachCountRisk(breaches.length) * 0.4;
  return Math.min(100, Math.round((years.size / 12) * 100));
}

/** Riesgo compuesto principal (0–100). Solo datos HIBP del escaneo. */
export function computeOverallRiskScore(
  breaches: BreachRecord[],
  leaked: boolean,
  confidence: number
): number {
  const count = breaches.length;
  if (!leaked || count === 0) {
    return Math.max(0, Math.min(20, Math.round((1 - confidence) * 20)));
  }

  const countPart = breachCountRisk(count) * 0.4;
  const recencyPart = recencyRisk(breaches) * 0.25;
  const criticalPart = criticalDensityRisk(breaches) * 0.2;
  const spreadPart = timelineSpreadRisk(breaches) * 0.15;

  return Math.min(100, Math.round(countPart + recencyPart + criticalPart + spreadPart));
}

/**
 * Evolución año a año: al cierre de cada año se acumulan las brechas cuya
 * fecha HIBP es ≤ ese año y se recalcula el score. Adecuado para historiales
 * de 15+ años. No es historial guardado en 0xLeaked.
 */
export function buildEvolutionFromBreaches(
  breaches: BreachRecord[]
): { points: EvolutionPoint[]; note: string } {
  if (!breaches.length) {
    const year = new Date().getFullYear();
    return {
      points: [{ date: String(year), score: 0, breachCount: 0 }],
      note: "Sin brechas: no hay línea temporal que reconstruir."
    };
  }

  const withYear = breaches
    .map((b) => {
      const y = new Date(b.breachDate).getFullYear();
      return Number.isNaN(y) ? null : { breach: b, year: y };
    })
    .filter((x): x is { breach: BreachRecord; year: number } => x !== null);

  if (!withYear.length) {
    return {
      points: [],
      note: "Las brechas no traen fechas válidas para reconstruir la evolución."
    };
  }

  const firstYear = Math.min(...withYear.map((x) => x.year));
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = firstYear; y <= currentYear; y++) years.push(y);

  const points: EvolutionPoint[] = years.map((year) => {
    const knownByEndOfYear = withYear
      .filter((x) => x.year <= year)
      .map((x) => x.breach);
    const score = computeOverallRiskScore(knownByEndOfYear, true, 0.98);
    return {
      date: String(year),
      score,
      breachCount: knownByEndOfYear.length
    };
  });

  const spanYears = currentYear - firstYear + 1;

  return {
    points,
    note:
      spanYears > 1
        ? `Evolución ${firstYear}–${currentYear} (${spanYears} años): en cada año se acumulan las brechas HIBP conocidas hasta esa fecha. Ideal para historiales largos.`
        : `Evolución en ${firstYear}: brechas acumuladas al cierre del año según fechas HIBP.`
  };
}

function buildRadarAxes(breaches: BreachRecord[], leaked: boolean): RadarAxis[] {
  const count = breaches.length;

  if (!leaked || count === 0) {
    return [
      {
        axis: "Volumen\nde brechas",
        value: 0,
        fullMark: 100,
        description: "Cantidad de filtraciones en HIBP (escala log)."
      },
      {
        axis: "Brechas\nrecientes",
        value: 0,
        fullMark: 100,
        description: "Qué tan recientes son las brechas detectadas."
      },
      {
        axis: "Densidad\ncrítica",
        value: 0,
        fullMark: 100,
        description: "% de brechas posteriores a 2023."
      },
      {
        axis: "Superficie\ntemporal",
        value: 0,
        fullMark: 100,
        description: "Años distintos con exposición registrada."
      },
      {
        axis: "Urgencia\nde acción",
        value: 0,
        fullMark: 100,
        description: "Prioridad de remediación según volumen + recencia."
      },
      {
        axis: "Confianza\ndel scan",
        value: 0,
        fullMark: 100,
        description: "Fiabilidad de la fuente (HIBP vs heurística)."
      }
    ];
  }

  const countScore = breachCountRisk(count);
  const recency = recencyRisk(breaches);
  const critical = criticalDensityRisk(breaches);
  const spread = timelineSpreadRisk(breaches);
  const urgency = Math.min(
    100,
    Math.round(countScore * 0.5 + recency * 0.35 + critical * 0.15)
  );

  return [
    {
      axis: "Volumen\nde brechas",
      value: countScore,
      fullMark: 100,
      description: `${count} brecha(s) en HIBP. Escala log: 2 y 500+ ya no se ven iguales.`
    },
    {
      axis: "Brechas\nrecientes",
      value: recency,
      fullMark: 100,
      description: "Promedio de antigüedad: filtraciones nuevas pesan más."
    },
    {
      axis: "Densidad\ncrítica",
      value: critical,
      fullMark: 100,
      description: "Porcentaje de brechas con fecha posterior a enero 2023."
    },
    {
      axis: "Superficie\ntemporal",
      value: spread,
      fullMark: 100,
      description: "Cuántos años distintos aparecen en tu historial de brechas."
    },
    {
      axis: "Urgencia\nde acción",
      value: urgency,
      fullMark: 100,
      description: "Mezcla volumen + recencia: qué tan pronto deberías actuar."
    },
    {
      axis: "Confianza\ndel scan",
      value: 98,
      fullMark: 100,
      description: "Consulta directa a HIBP (alta confianza en email)."
    }
  ];
}

export function mapApiResponse(raw: RawScanResponse, target: string): BreachDashboardData {
  const breaches = raw.breaches ?? [];
  const confidence = raw.confidence ?? 0;
  const overallScore = computeOverallRiskScore(breaches, raw.leaked, confidence);
  const { points: evolution, note: evolutionNote } = buildEvolutionFromBreaches(breaches);

  const critical = breaches.filter((b) => new Date(b.breachDate) > new Date("2023-01-01"));
  const high = breaches.filter(
    (b) =>
      new Date(b.breachDate) > new Date("2020-01-01") &&
      new Date(b.breachDate) <= new Date("2023-01-01")
  );
  const medium = breaches.filter(
    (b) =>
      new Date(b.breachDate) > new Date("2017-01-01") &&
      new Date(b.breachDate) <= new Date("2020-01-01")
  );
  const low = breaches.filter((b) => new Date(b.breachDate) <= new Date("2017-01-01"));

  const alerts: BreachAlert[] = breaches.map((b) => ({
    title: `Brecha detectada: ${b.title}`,
    sub: stripHtml(b.description ?? "").slice(0, 80) + "...",
    time: timeAgo(b.breachDate),
    color: new Date(b.breachDate) > new Date("2023-01-01") ? "#ff4444" : "#ff8800",
    date: b.breachDate,
    name: b.name
  }));

  const actions = [
    {
      text: raw.evidence?.recommendation ?? "Cambia tus contraseñas comprometidas",
      icon: "🔑"
    },
    { text: "Activa 2FA en todas tus cuentas", icon: "🔒" },
    { text: "Revisa reuso de credenciales", icon: "🔍" },
    { text: "Monitorea actividad sospechosa", icon: "📡" }
  ];

  return {
    target,
    targetType: raw.targetType ?? "email",
    overallScore,
    riskLevel: raw.leaked ? riskLabel(overallScore) : "BAJO",
    leaked: raw.leaked,
    confidence,
    source: raw.source ?? "unknown",
    evidenceId: raw.evidence?.evidenceId,
    targetHash: raw.evidence?.targetHash,
    evidence: raw.evidence,
    radarAxes: buildRadarAxes(breaches, raw.leaked),
    riskSummary: [
      { label: "Riesgo Crítico", count: critical.length, color: "#ff4444" },
      { label: "Riesgo Alto", count: high.length, color: "#ff8800" },
      { label: "Riesgo Medio", count: medium.length, color: "#ffcc00" },
      { label: "Riesgo Bajo", count: low.length, color: "#44ff88" }
    ],
    actions,
    alerts,
    evolution,
    evolutionNote,
    breaches
  };
}

export async function fetchBreachData(
  target: string,
  targetType: "email" | "phone" | "wallet",
  beneficiary?: string,
  registerOnChain = false
): Promise<BreachDashboardData> {
  const payload: Record<string, string | boolean> = { target, targetType };
  if (beneficiary) payload.beneficiary = beneficiary;
  if (registerOnChain) payload.registerOnChain = true;

  const res = await fetch(`${gatewayBaseUrl}/api/breach/scan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string; details?: string };
    throw new Error(err.details ?? err.error ?? `Error ${res.status}`);
  }

  const raw = (await res.json()) as RawScanResponse;
  if (!raw.ok) throw new Error("Respuesta inválida del servidor");
  return mapApiResponse(raw, target);
}
