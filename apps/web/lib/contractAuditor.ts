import { isAddress } from "viem";

const gatewayBaseUrl = process.env.NEXT_PUBLIC_API_GATEWAY_URL ?? "http://localhost:4000";

export type ContractAuditResult = {
  ok: boolean;
  contractAddress: string;
  riskScore: number;
  verdict: "low-risk" | "medium-risk" | "high-risk";
  label: "low" | "medium" | "high";
  flags: string[];
  recommendations: string[];
  isBlacklisted: boolean;
  verification?: {
    isVerified: boolean | null;
    source: string;
    compilerVersion?: string;
    license?: string;
  };
  bytecode?: {
    size: number;
    isEmpty: boolean;
    isProxy: boolean;
    isMinimalProxy: boolean;
    hasSelfdestruct: boolean;
    hasDelegatecall: boolean;
    hasHiddenMint: boolean;
    hasHiddenFee: boolean;
    hasSuspiciousTransfer: boolean;
  };
  onChain?: {
    registered: boolean;
    txHash?: string;
    blockNumber?: string;
  } | null;
};

export function riskLabelFromVerdict(verdict: ContractAuditResult["verdict"]): string {
  if (verdict === "high-risk") return "ALTO RIESGO";
  if (verdict === "medium-risk") return "RIESGO MEDIO";
  return "BAJO RIESGO";
}

export function riskColorFromScore(score: number): string {
  if (score >= 70) return "#ef4444";
  if (score >= 40) return "#f59e0b";
  return "#10b981";
}

function labelToVerdict(label: string): ContractAuditResult["verdict"] {
  if (label === "high") return "high-risk";
  if (label === "medium") return "medium-risk";
  return "low-risk";
}

export async function analyzeContractAddress(contractAddress: string): Promise<ContractAuditResult> {
  const normalized = contractAddress.trim();

  if (!isAddress(normalized)) {
    throw new Error("La dirección del contrato no es válida.");
  }

  const res = await fetch(`${gatewayBaseUrl}/api/contracts/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contractAddress: normalized })
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string; details?: string };
    throw new Error(err.details ?? err.error ?? `Error ${res.status}`);
  }

  const raw = await res.json();
  if (!raw.ok) throw new Error("Respuesta inválida del analyzer-service");

  return {
    ...raw,
    verdict: labelToVerdict(raw.label ?? "low"),
    recommendations: raw.recommendations ?? [],
    isBlacklisted: raw.isBlacklisted ?? false
  } as ContractAuditResult;
}
