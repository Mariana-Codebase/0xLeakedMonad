import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as dotenv } from "dotenv";
import WebSocket from "ws";
import {
  createPublicClient,
  decodeEventLog,
  http,
  webSocket,
  type Address,
  type Hex,
  type Log,
  type PublicClient
} from "viem";
import {
  breachRegistryAbi,
  alertOracleAbi,
  remediationVaultAbi
} from "@0xleaked/abi";
import { getMonadTestnet } from "@0xleaked/chain";
import { prisma } from "@0xleaked/db";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv({ path: path.resolve(__dirname, "../../../.env") });

const MONAD_RPC_URL = process.env.MONAD_RPC_URL ?? "";
const MONAD_WSS_URL = MONAD_RPC_URL.replace("https://", "wss://");

const BREACH_REGISTRY = (process.env.BREACH_REGISTRY_ADDRESS ?? "").trim() as Address | "";
const ALERT_ORACLE = (process.env.ALERT_ORACLE_ADDRESS ?? "").trim() as Address | "";
const REMEDIATION_VAULT = (process.env.REMEDIATION_VAULT_ADDRESS ?? "").trim() as Address | "";

const MAX_BLOCK_RANGE = BigInt(process.env.INDEXER_MAX_BLOCK_RANGE ?? 10);
const BACKFILL_BLOCKS = BigInt(process.env.INDEXER_BACKFILL_BLOCKS ?? 100);
const CHUNK_DELAY_MS = Number(process.env.INDEXER_CHUNK_DELAY_MS ?? 350);
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30000;

type WatchTarget = {
  name: string;
  address: Address;
  abi: readonly unknown[];
  handlers: Record<string, EventHandler>;
};

type EventHandler = (args: Record<string, unknown>, ctx: EventContext) => Promise<void>;
type EventContext = {
  txHash: Hex;
  blockNumber: bigint;
  logIndex: number;
  contract: Address;
  eventName: string;
};

const targets: WatchTarget[] = [];

function setupTargets() {
  if (BREACH_REGISTRY) {
    targets.push({
      name: "BreachRegistry",
      address: BREACH_REGISTRY,
      abi: breachRegistryAbi as readonly unknown[],
      handlers: { BreachRecorded: onBreachRecorded, VerifierSet: onVerifierSet }
    });
  }
  if (ALERT_ORACLE) {
    targets.push({
      name: "AlertOracle",
      address: ALERT_ORACLE,
      abi: alertOracleAbi as readonly unknown[],
      handlers: { ScoreUpdated: onScoreUpdated, VerifierSet: onVerifierSet }
    });
  }
  if (REMEDIATION_VAULT) {
    targets.push({
      name: "RemediationVault",
      address: REMEDIATION_VAULT,
      abi: remediationVaultAbi as readonly unknown[],
      handlers: {
        NativeDeposited: onVaultEvent,
        NativeWithdrawn: onVaultEvent,
        TokenDeposited: onVaultEvent,
        TokenWithdrawn: onVaultEvent
      }
    });
  }
}

const onBreachRecorded: EventHandler = async (args, ctx) => {
  const targetHash = String(args.targetHash);
  const source = String(args.source);
  const dataType = String(args.dataType) as "email" | "phone" | "wallet";
  const beneficiary = String(args.beneficiary) as Address;
  const reporter = String(args.reporter) as Address;

  await prisma.breach.upsert({
    where: { targetHash_source: { targetHash, source: sourceToDb(source) } },
    create: {
      targetHash,
      targetType: dataType,
      source: sourceToDb(source),
      beneficiary: beneficiary === "0x0000000000000000000000000000000000000000" ? null : beneficiary,
      reporter,
      txHash: ctx.txHash,
      blockNumber: ctx.blockNumber,
      registeredAt: new Date()
    },
    update: {
      txHash: ctx.txHash,
      blockNumber: ctx.blockNumber,
      reporter,
      beneficiary: beneficiary === "0x0000000000000000000000000000000000000000" ? null : beneficiary,
      registeredAt: new Date()
    }
  });

  console.log(`[indexer] BreachRecorded · ${targetHash.slice(0, 10)}… by ${reporter}`);
};

const onScoreUpdated: EventHandler = async (args, ctx) => {
  const contractAddress = String(args.contractAddress).toLowerCase();
  const score = Number(args.score);
  const label = String(args.label) as "low" | "medium" | "high";

  await prisma.riskScore.upsert({
    where: { contractAddress },
    create: {
      contractAddress,
      score,
      label,
      flags: [],
      txHash: ctx.txHash,
      blockNumber: ctx.blockNumber,
      registeredAt: new Date()
    },
    update: {
      score,
      label,
      txHash: ctx.txHash,
      blockNumber: ctx.blockNumber,
      registeredAt: new Date()
    }
  });

  console.log(`[indexer] ScoreUpdated · ${contractAddress} → ${score} (${label})`);
};

const onVaultEvent: EventHandler = async (_args, ctx) => {
  console.log(`[indexer] ${ctx.eventName} · ${ctx.txHash.slice(0, 12)}…`);
};

const onVerifierSet: EventHandler = async (args, ctx) => {
  console.log(`[indexer] VerifierSet · ${args.verifier} enabled=${args.enabled} tx=${ctx.txHash.slice(0, 12)}…`);
};

function sourceToDb(s: string): "hibp" | "simulated" | "manual" | "other" {
  if (s === "hibp" || s === "simulated" || s === "manual") return s;
  return "other";
}

function bigintReplacer(_key: string, value: unknown): unknown {
  return typeof value === "bigint" ? value.toString() : value;
}

async function persistAndDispatch(log: Log, target: WatchTarget): Promise<void> {
  if (log.blockNumber === null || log.transactionHash === null || log.logIndex === null) {
    return;
  }

  let decoded: ReturnType<typeof decodeEventLog>;
  try {
    decoded = decodeEventLog({
      abi: target.abi,
      data: log.data,
      topics: log.topics
    });
  } catch {
    return;
  }

  const eventName = decoded.eventName;
  const args = (decoded.args ?? {}) as Record<string, unknown>;
  const blockNumber = log.blockNumber;
  const txHash = log.transactionHash;
  const logIndex = log.logIndex;
  const chainId = getMonadTestnet().id;

  try {
    await prisma.onChainEvent.create({
      data: {
        chainId,
        contract: target.address,
        eventName,
        txHash,
        blockNumber,
        logIndex,
        args: JSON.parse(JSON.stringify(args, bigintReplacer))
      }
    });
  } catch (err) {
    if (!String(err).includes("Unique constraint")) {
      console.error(`[indexer] error guardando evento:`, err);
    }
  }

  const handler = target.handlers[eventName];
  if (handler) {
    try {
      await handler(args, { txHash, blockNumber, logIndex, contract: target.address, eventName });
    } catch (err) {
      console.error(`[indexer] handler ${eventName} falló:`, err);
    }
  }
}

async function getCursor(contract: Address, defaultBlock: bigint): Promise<bigint> {
  const cursor = await prisma.indexerCursor.findUnique({ where: { contract } });
  if (cursor) return cursor.lastBlock;
  await prisma.indexerCursor.create({ data: { contract, lastBlock: defaultBlock } });
  return defaultBlock;
}

async function setCursor(contract: Address, lastBlock: bigint): Promise<void> {
  await prisma.indexerCursor.upsert({
    where: { contract },
    create: { contract, lastBlock },
    update: { lastBlock }
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function backfill(client: PublicClient, target: WatchTarget): Promise<void> {
  const head = await client.getBlockNumber();
  const startBlock = head > BACKFILL_BLOCKS ? head - BACKFILL_BLOCKS : 0n;
  let cursor = await getCursor(target.address, startBlock);

  if (cursor >= head) {
    console.log(`[indexer] ${target.name} ya sincronizado hasta bloque ${head}`);
    return;
  }

  console.log(`[indexer] ${target.name} backfill desde ${cursor + 1n} hasta ${head}`);

  let from = cursor + 1n;
  while (from <= head) {
    const to = from + MAX_BLOCK_RANGE - 1n > head ? head : from + MAX_BLOCK_RANGE - 1n;

    const logs = await client.getLogs({
      address: target.address,
      fromBlock: from,
      toBlock: to
    });

    for (const log of logs) {
      await persistAndDispatch(log, target);
    }

    if (logs.length > 0) {
      console.log(`[indexer] ${target.name} · bloques ${from}-${to} · ${logs.length} eventos`);
    }

    await setCursor(target.address, to);
    from = to + 1n;
    await sleep(CHUNK_DELAY_MS);
  }

  console.log(`[indexer] ${target.name} backfill completo`);
}

async function subscribeToLogs(client: PublicClient): Promise<void> {
  const addresses = targets.map((t) => t.address);

  console.log(`[indexer] Suscribiendo a logs en tiempo real para ${addresses.length} contratos...`);

  const unwatch = client.watchBlockNumber({
    onBlockNumber: async (blockNumber) => {
      for (const target of targets) {
        try {
          const logs = await client.getLogs({
            address: target.address,
            fromBlock: blockNumber,
            toBlock: blockNumber
          });

          for (const log of logs) {
            await persistAndDispatch(log, target);
          }

          if (logs.length > 0) {
            await setCursor(target.address, blockNumber);
          }
        } catch (err) {
          console.error(`[indexer] Error procesando bloque ${blockNumber} para ${target.name}:`, err);
        }
      }
    },
    onError: (error) => {
      console.error("[indexer] Error en watchBlockNumber:", error);
    }
  });

  process.on("SIGINT", () => {
    console.log("[indexer] Cerrando suscripción...");
    unwatch();
    process.exit(0);
  });
}

function createHttpClient(): PublicClient {
  const chain = getMonadTestnet();
  const rpc = MONAD_RPC_URL.startsWith("wss://")
    ? MONAD_RPC_URL.replace("wss://", "https://")
    : MONAD_RPC_URL;
  return createPublicClient({ chain, transport: http(rpc) });
}

function createWsClient(): PublicClient {
  const chain = getMonadTestnet();

  if (MONAD_WSS_URL && MONAD_WSS_URL.startsWith("wss://")) {
    console.log(`[indexer] Realtime WebSocket: ${MONAD_WSS_URL.slice(0, 50)}...`);
    return createPublicClient({
      chain,
      transport: webSocket(MONAD_WSS_URL, {
        reconnect: { attempts: 10, delay: 1000 },
        keepAlive: { interval: 30_000 }
      })
    });
  }

  console.log(`[indexer] WebSocket no disponible, realtime vía HTTP`);
  return createHttpClient();
}

async function main(): Promise<void> {
  setupTargets();

  if (targets.length === 0) {
    console.error(
      "[indexer] Ninguna address de contrato configurada. " +
      "Setea BREACH_REGISTRY_ADDRESS, ALERT_ORACLE_ADDRESS o REMEDIATION_VAULT_ADDRESS."
    );
    process.exit(1);
  }

  console.log(`[indexer] Iniciando con ${targets.length} contratos en Monad Testnet`);
  console.log(`[indexer] Contratos: ${targets.map((t) => `${t.name}(${t.address.slice(0, 10)}...)`).join(", ")}`);

  const httpClient = createHttpClient();
  console.log(`[indexer] Backfill vía HTTP (últimos ${BACKFILL_BLOCKS} bloques, chunks de ${MAX_BLOCK_RANGE})`);

  for (const target of targets) {
    await backfill(httpClient, target);
  }

  const wsClient = createWsClient();
  await subscribeToLogs(wsClient);

  console.log("[indexer] Escuchando eventos en tiempo real... (Ctrl+C para salir)");

  await new Promise(() => {});
}

main().catch((err) => {
  console.error("[indexer] crash fatal:", err);
  process.exit(1);
});
