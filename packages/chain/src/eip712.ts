import type { Address, Hex } from "viem";
import { getMonadChainId } from "./monad.js";
import { requireServerWallet } from "./clients.js";

// --------------------------------------------------------------------------
// Domains
// --------------------------------------------------------------------------

export function breachRegistryDomain(contract: Address) {
  return {
    name: "0xLeaked.BreachRegistry",
    version: "1",
    chainId: getMonadChainId(),
    verifyingContract: contract
  } as const;
}

export function alertOracleDomain(contract: Address) {
  return {
    name: "0xLeaked.AlertOracle",
    version: "1",
    chainId: getMonadChainId(),
    verifyingContract: contract
  } as const;
}

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

export const BREACH_EVIDENCE_TYPES = {
  BreachEvidence: [
    { name: "targetHash", type: "bytes32" },
    { name: "source", type: "string" },
    { name: "dataType", type: "string" },
    { name: "beneficiary", type: "address" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" }
  ]
} as const;

export const RISK_SCORE_TYPES = {
  RiskScoreUpdate: [
    { name: "contractAddress", type: "address" },
    { name: "score", type: "uint8" },
    { name: "label", type: "string" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" }
  ]
} as const;

// --------------------------------------------------------------------------
// Payloads
// --------------------------------------------------------------------------

export type BreachEvidencePayload = {
  targetHash: Hex;
  source: string;
  dataType: string;
  beneficiary: Address;
  nonce: bigint;
  deadline: bigint;
};

export type RiskScorePayload = {
  contractAddress: Address;
  score: number; // 0-100
  label: string;
  nonce: bigint;
  deadline: bigint;
};

// --------------------------------------------------------------------------
// Signers
// --------------------------------------------------------------------------

export async function signBreachEvidence(
  registryAddress: Address,
  payload: BreachEvidencePayload
): Promise<Hex> {
  const { client, account } = requireServerWallet();
  return client.signTypedData({
    account,
    domain: breachRegistryDomain(registryAddress),
    types: BREACH_EVIDENCE_TYPES,
    primaryType: "BreachEvidence",
    message: payload
  });
}

export async function signRiskScore(
  oracleAddress: Address,
  payload: RiskScorePayload
): Promise<Hex> {
  const { client, account } = requireServerWallet();
  return client.signTypedData({
    account,
    domain: alertOracleDomain(oracleAddress),
    types: RISK_SCORE_TYPES,
    primaryType: "RiskScoreUpdate",
    message: payload
  });
}

export function makeDeadline(secondsFromNow = 900): bigint {
  return BigInt(Math.floor(Date.now() / 1000) + secondsFromNow);
}
