import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as dotenv } from "dotenv";
import express from "express";
import {
  getAddress,
  isAddress,
  type Address,
  type Hex
} from "viem";
import { alertOracleAbi } from "@0xleaked/abi";
import {
  getPublicClient,
  getServerWallet,
  monadTestnet,
  signRiskScore,
  makeDeadline
} from "@0xleaked/chain";
import { pinJson } from "@0xleaked/ipfs";
import {
  analyzeContractFull,
  isBlacklisted,
  type FullAnalysis
} from "./bytecodeAnalyzer.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv({ path: path.resolve(__dirname, "../../../.env") });

const app = express();
const port = Number(process.env.ANALYZER_SERVICE_PORT ?? 4102);
const startedAt = Date.now();
const oracleAddress = (process.env.ALERT_ORACLE_ADDRESS ?? "").trim() as Address | "";
const HIGH_RISK_THRESHOLD = 70;

app.use(express.json({ limit: "20kb" }));

// --------------------------------------------------------------------------
// Health
// --------------------------------------------------------------------------

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "analyzer-service",
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    serverWalletAddress: getServerWallet()?.account.address ?? null,
    oracleAddress: oracleAddress || null,
    highRiskThreshold: HIGH_RISK_THRESHOLD
  });
});

// --------------------------------------------------------------------------
// Helpers on-chain
// --------------------------------------------------------------------------

async function fetchDeployedBytecode(address: Address): Promise<Hex | "0x"> {
  const client = getPublicClient();
  const code = (await client.getBytecode({ address })) ?? "0x";
  return code as Hex;
}

type OracleResult =
  | { ok: true; txHash: Hex; blockNumber: bigint }
  | { ok: false; code: string; reason: string };

async function pushScoreOnChain(
  contractAddress: Address,
  score: number,
  label: string
): Promise<OracleResult> {
  if (!oracleAddress) {
    return { ok: false, code: "oracle_not_deployed", reason: "ALERT_ORACLE_ADDRESS no configurada" };
  }
  const wallet = getServerWallet();
  if (!wallet) {
    return { ok: false, code: "server_wallet_missing", reason: "INDEXER_PRIVATE_KEY no configurada" };
  }

  const publicClient = getPublicClient();
  const nonce = (await publicClient.readContract({
    address: oracleAddress,
    abi: alertOracleAbi,
    functionName: "nonces",
    args: [wallet.account.address]
  })) as bigint;

  const deadline = makeDeadline(900);
  const signature = await signRiskScore(oracleAddress, {
    contractAddress,
    score,
    label,
    nonce,
    deadline
  });

  try {
    await publicClient.simulateContract({
      address: oracleAddress,
      abi: alertOracleAbi,
      functionName: "updateScoreWithProof",
      args: [contractAddress, score, label, nonce, deadline, signature],
      account: wallet.account
    });
  } catch (error) {
    return { ok: false, code: "simulation_failed", reason: (error as Error).message };
  }

  let txHash: Hex;
  try {
    txHash = await wallet.client.writeContract({
      address: oracleAddress,
      abi: alertOracleAbi,
      functionName: "updateScoreWithProof",
      args: [contractAddress, score, label, nonce, deadline, signature],
      account: wallet.account,
      chain: monadTestnet
    });
  } catch (error) {
    const msg = (error as Error).message ?? "writeContract failed";
    const isInsufficientFunds = /insufficient|balance|funds/i.test(msg);
    return {
      ok: false,
      code: isInsufficientFunds ? "insufficient_funds" : "tx_send_failed",
      reason: isInsufficientFunds
        ? "La wallet del servidor no tiene fondos para gas. Envía MON testnet a " + wallet.account.address
        : msg.slice(0, 300)
    };
  }

  try {
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
      confirmations: 1,
      timeout: 60_000
    });

    return { ok: true, txHash, blockNumber: receipt.blockNumber };
  } catch (error) {
    return {
      ok: false,
      code: "receipt_timeout",
      reason: "Tx enviada pero la confirmación no llegó: " + (error as Error).message
    };
  }
}

// --------------------------------------------------------------------------
// POST /analyze
// --------------------------------------------------------------------------

app.post("/analyze", async (req, res) => {
  const requestId = crypto.randomBytes(4).toString("hex");
  const raw = String(req.body?.contractAddress ?? "").trim();

  if (!raw || !isAddress(raw)) {
    res.status(400).json({
      ok: false,
      error: "invalid_address",
      details: "contractAddress debe ser un address EVM válido (0x...)"
    });
    return;
  }

  const address = getAddress(raw); // checksum
  console.log(`[analyzer-service] request=${requestId} address=${address}`);

  let bytecode: Hex | "0x";
  try {
    bytecode = await fetchDeployedBytecode(address);
  } catch (error) {
    res.status(502).json({
      ok: false,
      error: "rpc_error",
      details: (error as Error).message
    });
    return;
  }

  console.log(`[analyzer-service] request=${requestId} analizando bytecode y verificación...`);

  const fullAnalysis: FullAnalysis = await analyzeContractFull(
    address,
    bytecode,
    monadTestnet.id
  );

  const { bytecode: analysis, verification, scoring } = fullAnalysis;

  console.log(`[analyzer-service] request=${requestId} score=${scoring.score} label=${scoring.label} verified=${verification.isVerified}`);

  // Pin analysis to IPFS
  let ipfsCid: string | undefined;
  try {
    ipfsCid = await pinJson({
      contractAddress: address,
      score: scoring.score,
      label: scoring.label,
      flags: scoring.flags,
      bytecodeSize: analysis.bytecodeSize,
      hasSelfdestruct: analysis.hasSelfdestruct,
      hasDelegatecall: analysis.hasDelegatecall,
      verified: verification.isVerified,
      analyzedAt: new Date().toISOString()
    }, { name: `audit-${address.slice(0, 10)}` });
    console.log(`[analyzer-service] request=${requestId} IPFS pinned: ${ipfsCid}`);
  } catch (ipfsErr) {
    console.warn(`[analyzer-service] request=${requestId} IPFS pin falló:`, (ipfsErr as Error).message);
  }

  // Push on-chain si es high-risk
  let onChain: OracleResult | null = null;
  if (scoring.score >= HIGH_RISK_THRESHOLD) {
    onChain = await pushScoreOnChain(address, scoring.score, scoring.label);

    if (!onChain.ok) {
      console.warn(
        `[analyzer-service] request=${requestId} on-chain falló: ${onChain.code} - ${onChain.reason}`
      );
    }
  }

  res.json({
    ok: true,
    contractAddress: address,
    riskScore: scoring.score,
    label: scoring.label,
    flags: scoring.flags,
    recommendations: scoring.recommendations,
    verification: {
      isVerified: verification.isVerified,
      source: verification.source,
      compilerVersion: verification.compilerVersion,
      license: verification.license
    },
    bytecode: {
      size: analysis.bytecodeSize,
      isEmpty: analysis.isEmpty,
      isProxy: analysis.isProxy,
      isMinimalProxy: analysis.isMinimalProxy,
      hasSelfdestruct: analysis.hasSelfdestruct,
      hasDelegatecall: analysis.hasDelegatecall,
      hasHiddenMint: analysis.hasHiddenMint,
      hasHiddenFee: analysis.hasHiddenFee,
      hasSuspiciousTransfer: analysis.hasSuspiciousTransfer
    },
    isBlacklisted: fullAnalysis.isBlacklisted,
    onChain: onChain?.ok
      ? {
          registered: true,
          txHash: onChain.txHash,
          blockNumber: String(onChain.blockNumber),
          oracleAddress
        }
      : scoring.score >= HIGH_RISK_THRESHOLD
        ? {
            registered: false,
            reason: onChain?.reason ?? "on-chain registration skipped",
            code: onChain?.code ?? "unknown"
          }
        : { registered: false, reason: "score por debajo del threshold high-risk" }
  });
});

app.listen(port, () => {
  console.log(`[analyzer-service] corriendo en http://localhost:${port}`);
});
