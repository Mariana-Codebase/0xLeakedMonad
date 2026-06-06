"use client";

/**
 * Hooks and utilities to read data directly from on-chain contracts
 * instead of relying on the API gateway / PostgreSQL.
 *
 * Data flow:
 *   1. Read events from BreachRegistry / AlertOracle contracts
 *   2. Extract IPFS CID from the `source` field (format: "hibp:Qm..." or "ipfs:bafy...")
 *   3. Fetch enriched metadata from IPFS
 */

import { useCallback, useEffect, useState } from "react";
import {
  type Address,
  type PublicClient,
  decodeEventLog,
  parseAbiItem
} from "viem";
import { usePublicClient } from "wagmi";
import { breachRegistryAbi, alertOracleAbi } from "@0xleaked/abi";

const BREACH_REGISTRY = process.env.NEXT_PUBLIC_BREACH_REGISTRY_ADDRESS as Address | undefined;
const ALERT_ORACLE = process.env.NEXT_PUBLIC_ALERT_ORACLE_ADDRESS as Address | undefined;
const IPFS_GATEWAY =
  process.env.NEXT_PUBLIC_IPFS_GATEWAY_URL ?? "https://gateway.pinata.cloud/ipfs";

export type OnChainBreachRecord = {
  id: bigint;
  targetHash: string;
  source: string;
  dataType: string;
  beneficiary: Address;
  reporter: Address;
  timestamp: bigint;
  txHash: string;
  blockNumber: bigint;
  ipfsCid?: string;
};

export type OnChainRiskScore = {
  contractAddress: Address;
  score: number;
  label: string;
  updatedAt: bigint;
  updatedBy: Address;
  txHash: string;
  blockNumber: bigint;
};

export type IpfsBreachMetadata = {
  target?: string;
  targetType?: string;
  breaches?: Array<{
    name: string;
    title: string;
    domain?: string;
    breachDate: string;
    pwnCount?: number;
    description?: string;
    dataClasses?: string[];
    isVerified?: boolean;
  }>;
  confidence?: number;
  scannedAt?: string;
};

/**
 * Extract IPFS CID from source string.
 * Formats: "hibp:QmXxx...", "ipfs:bafyxxx...", or raw CID.
 */
export function extractCidFromSource(source: string): string | undefined {
  if (!source) return undefined;

  const ipfsPrefix = source.match(/^(?:ipfs|hibp|scan):(.+)$/i);
  if (ipfsPrefix) {
    const candidate = ipfsPrefix[1];
    if (candidate.startsWith("Qm") || candidate.startsWith("bafy")) {
      return candidate;
    }
  }

  if (source.startsWith("Qm") || source.startsWith("bafy")) {
    return source;
  }

  return undefined;
}

export function buildIpfsUrl(cid: string): string {
  return `${IPFS_GATEWAY}/${cid}`;
}

export async function fetchIpfsMetadata(cid: string): Promise<IpfsBreachMetadata | null> {
  try {
    const res = await fetch(buildIpfsUrl(cid), {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10_000)
    });
    if (!res.ok) return null;
    return (await res.json()) as IpfsBreachMetadata;
  } catch {
    return null;
  }
}

/**
 * Fetch all BreachRecorded events from the contract.
 */
export async function getBreachEvents(
  client: PublicClient,
  opts?: { beneficiary?: Address; targetHash?: string; fromBlock?: bigint }
): Promise<OnChainBreachRecord[]> {
  if (!BREACH_REGISTRY) return [];

  const args: Record<string, unknown> = {};
  if (opts?.beneficiary) args.beneficiary = opts.beneficiary;
  if (opts?.targetHash) args.targetHash = opts.targetHash;

  const logs = await client.getLogs({
    address: BREACH_REGISTRY,
    event: parseAbiItem(
      "event BreachRecorded(uint256 indexed id, bytes32 indexed targetHash, address indexed beneficiary, string source, string dataType, address reporter, uint256 nonce)"
    ),
    args: args as never,
    fromBlock: opts?.fromBlock ?? 0n,
    toBlock: "latest"
  });

  return logs.map((log) => {
    const { args: decoded } = decodeEventLog({
      abi: breachRegistryAbi,
      eventName: "BreachRecorded",
      data: log.data,
      topics: log.topics
    });

    const source = (decoded as { source: string }).source;
    return {
      id: (decoded as { id: bigint }).id,
      targetHash: log.topics[1] ?? "0x",
      source,
      dataType: (decoded as { dataType: string }).dataType,
      beneficiary: (decoded as { beneficiary: Address }).beneficiary,
      reporter: (decoded as { reporter: Address }).reporter,
      timestamp: (decoded as { nonce: bigint }).nonce,
      txHash: log.transactionHash ?? "0x",
      blockNumber: log.blockNumber ?? 0n,
      ipfsCid: extractCidFromSource(source)
    };
  });
}

/**
 * Fetch risk score for a contract directly from on-chain.
 */
export async function getOnChainRiskScore(
  client: PublicClient,
  contractAddress: Address
): Promise<OnChainRiskScore | null> {
  if (!ALERT_ORACLE) return null;

  try {
    const result = await client.readContract({
      address: ALERT_ORACLE,
      abi: alertOracleAbi,
      functionName: "scores",
      args: [contractAddress]
    });

    const [score, label, updatedAt, updatedBy] = result as [number, string, bigint, Address];

    if (score === 0 && label === "" && updatedAt === 0n) return null;

    return {
      contractAddress,
      score,
      label,
      updatedAt,
      updatedBy,
      txHash: "",
      blockNumber: 0n
    };
  } catch {
    return null;
  }
}

/**
 * Read a specific breach record by ID directly from contract storage.
 */
export async function getBreachRecordById(
  client: PublicClient,
  recordId: bigint
): Promise<OnChainBreachRecord | null> {
  if (!BREACH_REGISTRY) return null;

  try {
    const result = await client.readContract({
      address: BREACH_REGISTRY,
      abi: breachRegistryAbi,
      functionName: "records",
      args: [recordId]
    });

    const [targetHash, source, dataType, beneficiary, reporter, timestamp] =
      result as [string, string, string, Address, Address, bigint];

    return {
      id: recordId,
      targetHash,
      source,
      dataType,
      beneficiary,
      reporter,
      timestamp,
      txHash: "",
      blockNumber: 0n,
      ipfsCid: extractCidFromSource(source)
    };
  } catch {
    return null;
  }
}

/**
 * Get all breach record IDs for a beneficiary address.
 */
export async function getRecordsOfBeneficiary(
  client: PublicClient,
  beneficiary: Address
): Promise<bigint[]> {
  if (!BREACH_REGISTRY) return [];

  try {
    const result = await client.readContract({
      address: BREACH_REGISTRY,
      abi: breachRegistryAbi,
      functionName: "recordsOfBeneficiary",
      args: [beneficiary]
    });
    return result as bigint[];
  } catch {
    return [];
  }
}

/**
 * Get total number of breaches registered on-chain.
 */
export async function getTotalBreaches(client: PublicClient): Promise<bigint> {
  if (!BREACH_REGISTRY) return 0n;

  try {
    const result = await client.readContract({
      address: BREACH_REGISTRY,
      abi: breachRegistryAbi,
      functionName: "totalBreaches"
    });
    return result as bigint;
  } catch {
    return 0n;
  }
}

// ─── React Hooks ──────────────────────────────────────────────────────────────

export function useOnChainBreaches(beneficiary?: Address) {
  const publicClient = usePublicClient();
  const [records, setRecords] = useState<OnChainBreachRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!publicClient) return;
    setLoading(true);
    setError(null);
    try {
      const events = await getBreachEvents(publicClient, { beneficiary });
      setRecords(events);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [publicClient, beneficiary]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { records, loading, error, refresh };
}

export function useOnChainRiskScore(contractAddress?: Address) {
  const publicClient = usePublicClient();
  const [score, setScore] = useState<OnChainRiskScore | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!publicClient || !contractAddress) return;
    setLoading(true);
    getOnChainRiskScore(publicClient, contractAddress)
      .then(setScore)
      .catch(() => setScore(null))
      .finally(() => setLoading(false));
  }, [publicClient, contractAddress]);

  return { score, loading };
}

export function useIpfsMetadata(cid?: string) {
  const [metadata, setMetadata] = useState<IpfsBreachMetadata | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!cid) {
      setMetadata(null);
      return;
    }
    setLoading(true);
    fetchIpfsMetadata(cid)
      .then(setMetadata)
      .finally(() => setLoading(false));
  }, [cid]);

  return { metadata, loading };
}
