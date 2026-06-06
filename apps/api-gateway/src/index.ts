import cors from "cors";
import crypto from "node:crypto";
import { createServer } from "node:http";
import express from "express";
import { WebSocketServer, WebSocket } from "ws";
import { isAddress, parseAbiItem, type Address } from "viem";
import { remediationVaultAbi, breachRegistryAbi } from "@0xleaked/abi";
import { getPublicClient } from "@0xleaked/chain";
import { config } from "./config.js";
import { postJson } from "./http.js";

type BreachScanPayload = {
  target: string;
  targetType: "email" | "phone" | "wallet";
};

type AnalyzerPayload = {
  contractAddress: string;
};

type WebhookEvent = {
  receivedAt: string;
  signaturePresent: boolean;
  suspicious: boolean;
  forwardedToAlertService: boolean;
  forwardError?: string;
  payload: unknown;
};

const app = express();
const startedAt = Date.now();
const recentAlchemyEvents: WebhookEvent[] = [];

function safeEqualHex(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "hex");
  const bBuf = Buffer.from(b, "hex");
  return aBuf.length === bBuf.length && crypto.timingSafeEqual(aBuf, bBuf);
}

function isValidAlchemySignature(rawBody: Buffer, signatureHeader: string | undefined): boolean {
  if (!config.alchemyWebhookSigningKey || !signatureHeader) return true;

  const provided = signatureHeader.replace(/^0x/, "").trim().toLowerCase();
  const expected = crypto
    .createHmac("sha256", config.alchemyWebhookSigningKey)
    .update(rawBody)
    .digest("hex")
    .toLowerCase();

  if (!provided || provided.length !== expected.length) return false;

  return safeEqualHex(provided, expected);
}

function detectSuspiciousSignals(payload: unknown): boolean {
  const raw = JSON.stringify(payload).toLowerCase();
  const indicators = [
    "phishing", "drain", "malicious", "exploit",
    "suspicious", "approval", "permit", "failed simulation"
  ];
  return indicators.some((word) => raw.includes(word));
}

function requestId(): string {
  return crypto.randomBytes(5).toString("hex");
}

app.post("/api/webhooks/alchemy", express.raw({ type: "application/json" }), async (req, res) => {
  const signature = req.header("X-Alchemy-Signature");
  const rawBody = req.body as Buffer;

  if (!Buffer.isBuffer(rawBody)) {
    res.status(400).json({ ok: false, error: "body vacio" });
    return;
  }

  if (!isValidAlchemySignature(rawBody, signature)) {
    res.status(401).json({ ok: false, error: "firma del webhook invalida" });
    return;
  }

  try {
    const payload = JSON.parse(rawBody.toString("utf-8")) as Record<string, unknown>;
    const suspicious = detectSuspiciousSignals(payload);
    let forwardedToAlertService = false;
    let forwardError: string | undefined;

    if (suspicious) {
      try {
        await postJson(`${config.alertServiceUrl}/notify`, {
          source: "alchemy-webhook",
          severity: "high",
          title: "Evento sospechoso detectado",
          summary: "Webhook de Alchemy contiene senales de riesgo.",
          payload
        });
        forwardedToAlertService = true;
      } catch (error) {
        forwardError = (error as Error).message;
      }
    }

    recentAlchemyEvents.unshift({
      receivedAt: new Date().toISOString(),
      signaturePresent: Boolean(signature),
      suspicious,
      forwardedToAlertService,
      forwardError,
      payload
    });

    recentAlchemyEvents.splice(20);

  } catch {
    res.status(400).json({ ok: false, error: "payload JSON invalido" });
    return;
  }

  console.log("[alchemy-webhook] evento recibido");
  res.json({ ok: true, accepted: true });
});

app.use(cors());
app.use(express.json());
app.use((req, _res, next) => {
  const id = requestId();
  console.log(`[api-gateway] request=${id} ${req.method} ${req.path}`);
  next();
});

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "api-gateway",
    env: config.appEnv,
    monadChainId: config.monadChainId,
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    upstreams: {
      breachServiceUrl: config.breachServiceUrl,
      analyzerServiceUrl: config.analyzerServiceUrl,
      alertServiceUrl: config.alertServiceUrl
    }
  });
});

app.get("/version", (_req, res) => {
  res.json({ ok: true, service: "api-gateway", version: "0.1.0-mvp" });
});

app.post("/api/breach/scan", async (req, res) => {
  const payload = req.body as BreachScanPayload;
  if (!payload?.target || !payload?.targetType) {
    res.status(400).json({ ok: false, error: "target y targetType son obligatorios" });
    return;
  }

  try {
    const result = await postJson<BreachScanPayload, unknown>(
      `${config.breachServiceUrl}/scan`,
      payload,
      { timeoutMs: 10_000, retries: 1 }
    );
    res.json(result);
  } catch (error) {
    res.status(502).json({
      ok: false,
      error: "breach-service no disponible",
      details: (error as Error).message
    });
  }
});

app.post("/api/breach/sign-for-claim", async (req, res) => {
  const { targetHash, source, dataType, beneficiary } = req.body ?? {};

  if (!targetHash || !source || !dataType || !beneficiary) {
    res.status(400).json({
      ok: false,
      error: "Faltan campos: targetHash, source, dataType, beneficiary"
    });
    return;
  }

  if (!isAddress(beneficiary)) {
    res.status(400).json({ ok: false, error: "beneficiary no es una dirección válida" });
    return;
  }

  try {
    const result = await postJson<
      { targetHash: string; source: string; dataType: string; beneficiary: string },
      { ok: boolean; signature?: string; nonce?: string; deadline?: string; error?: string }
    >(
      `${config.breachServiceUrl}/sign-for-claim`,
      { targetHash, source, dataType, beneficiary },
      { timeoutMs: 10_000, retries: 1 }
    );
    res.json(result);
  } catch (error) {
    res.status(502).json({
      ok: false,
      error: "breach-service no disponible",
      details: (error as Error).message
    });
  }
});

app.post("/api/contracts/analyze", async (req, res) => {
  const payload = req.body as AnalyzerPayload;
  if (!payload?.contractAddress || !payload.contractAddress.startsWith("0x")) {
    res.status(400).json({ ok: false, error: "contractAddress inválida" });
    return;
  }

  try {
    const result = await postJson<AnalyzerPayload, unknown>(
      `${config.analyzerServiceUrl}/analyze`,
      payload,
      { timeoutMs: 10_000, retries: 1 }
    );
    res.json(result);
  } catch (error) {
    res.status(502).json({
      ok: false,
      error: "analyzer-service no disponible",
      details: (error as Error).message
    });
  }
});

app.get("/api/modules", (_req, res) => {
  res.json({
    ok: true,
    modules: [
      { id: "breach-scanner",   status: "ready",   route: "/api/breach/scan" },
      { id: "contract-auditor", status: "ready",   route: "/api/contracts/analyze" },
      { id: "remediation-hub",  status: "ready", route: "/api/remediation/actions" }
    ]
  });
});

app.get("/api/remediation/actions", (_req, res) => {
  res.json({
    ok: true,
    steps: [
      "Rotar credenciales",
      "Revocar approvals de contratos sospechosos",
      "Mover fondos temporalmente a RemediationVault",
      "Monitorear actividad y alertas por 72 horas"
    ]
  });
});

app.get("/api/contracts/addresses", (_req, res) => {
  res.json({
    ok: true,
    chainId: Number(config.monadChainId),
    contracts: {
      breachRegistry: config.breachRegistryAddress || null,
      alertOracle: config.alertOracleAddress || null,
      remediationVault: config.remediationVaultAddress || null
    }
  });
});

app.get("/api/remediation/vault/balance/:address", async (req, res) => {
  const raw = String(req.params.address).trim();
  if (!isAddress(raw)) {
    res.status(400).json({ ok: false, error: "invalid_address" });
    return;
  }
  if (!config.remediationVaultAddress) {
    res.status(503).json({ ok: false, error: "vault_not_deployed" });
    return;
  }

  try {
    const client = getPublicClient();
    const nativeBal = (await client.readContract({
      address: config.remediationVaultAddress as Address,
      abi: remediationVaultAbi,
      functionName: "nativeBalanceOf",
      args: [raw as Address]
    })) as bigint;

    res.json({
      ok: true,
      address: raw,
      vaultAddress: config.remediationVaultAddress,
      nativeBalance: nativeBal.toString(),
      nativeBalanceWei: nativeBal.toString()
    });
  } catch (error) {
    res.status(502).json({
      ok: false,
      error: "rpc_error",
      details: (error as Error).message
    });
  }
});

app.get("/api/events/recent", async (req, res) => {
  const limit = Math.min(Number(req.query.limit ?? 20), 100);

  try {
    const client = getPublicClient();
    const currentBlock = await client.getBlockNumber();
    const fromBlock = currentBlock > 5000n ? currentBlock - 5000n : 0n;

    const registryAddress = config.breachRegistryAddress as Address | undefined;
    if (!registryAddress) {
      res.json({ ok: true, count: 0, events: [] });
      return;
    }

    const logs = await client.getLogs({
      address: registryAddress,
      event: parseAbiItem(
        "event BreachRecorded(uint256 indexed id, bytes32 indexed targetHash, address indexed beneficiary, string source, string dataType, address reporter, uint256 nonce)"
      ),
      fromBlock,
      toBlock: "latest"
    });

    const events = logs.slice(-limit).reverse().map((log, i) => ({
      id: String(i),
      contract: registryAddress,
      eventName: "BreachRecorded",
      txHash: log.transactionHash ?? "0x",
      blockNumber: (log.blockNumber ?? 0n).toString(),
      logIndex: log.logIndex ?? 0,
      args: { topics: log.topics, data: log.data },
      indexedAt: new Date().toISOString()
    }));

    res.json({ ok: true, count: events.length, events });
  } catch (error) {
    res.status(503).json({
      ok: false,
      error: "rpc_unavailable",
      details: (error as Error).message
    });
  }
});

app.get("/api/webhooks/alchemy/events", (_req, res) => {
  res.json({
    ok: true,
    count: recentAlchemyEvents.length,
    events: recentAlchemyEvents
  });
});

const server = createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

const wsClients = new Set<WebSocket>();

wss.on("connection", (ws, req) => {
  const clientIp = req.socket.remoteAddress ?? "unknown";
  console.log(`[ws] Nueva conexión desde ${clientIp}`);
  wsClients.add(ws);

  ws.send(JSON.stringify({
    type: "connected",
    message: "Conectado a 0xLeaked realtime",
    timestamp: new Date().toISOString()
  }));

  ws.on("message", (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === "ping") {
        ws.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
      } else if (msg.type === "subscribe") {
        console.log(`[ws] Cliente suscrito a: ${msg.channels?.join(", ") ?? "all"}`);
        ws.send(JSON.stringify({ type: "subscribed", channels: msg.channels ?? ["all"] }));
      }
    } catch {
    
    }
  });

  ws.on("close", () => {
    console.log(`[ws] Cliente desconectado`);
    wsClients.delete(ws);
  });

  ws.on("error", (err) => {
    console.error(`[ws] Error:`, err.message);
    wsClients.delete(ws);
  });
});

export function broadcastToClients(event: {
  type: string;
  data: unknown;
  timestamp?: string;
}) {
  const message = JSON.stringify({
    ...event,
    timestamp: event.timestamp ?? new Date().toISOString()
  });

  let sent = 0;
  for (const client of wsClients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
      sent++;
    }
  }

  if (sent > 0) {
    console.log(`[ws] Broadcast ${event.type} a ${sent} clientes`);
  }
}

let lastPolledBlock = 0n;
setInterval(async () => {
  if (wsClients.size === 0) return;
  const registryAddress = config.breachRegistryAddress as Address | undefined;
  if (!registryAddress) return;

  try {
    const client = getPublicClient();
    const currentBlock = await client.getBlockNumber();
    if (lastPolledBlock === 0n) lastPolledBlock = currentBlock > 50n ? currentBlock - 50n : 0n;

    const logs = await client.getLogs({
      address: registryAddress,
      event: parseAbiItem(
        "event BreachRecorded(uint256 indexed id, bytes32 indexed targetHash, address indexed beneficiary, string source, string dataType, address reporter, uint256 nonce)"
      ),
      fromBlock: lastPolledBlock + 1n,
      toBlock: "latest"
    });

    for (const log of logs) {
      broadcastToClients({
        type: "onchain_event",
        data: {
          eventName: "BreachRecorded",
          contract: registryAddress,
          txHash: log.transactionHash ?? "0x",
          blockNumber: (log.blockNumber ?? 0n).toString(),
          args: { topics: log.topics, data: log.data }
        }
      });
    }

    lastPolledBlock = currentBlock;
  } catch {
  }
}, 5000);

server.listen(config.port, () => {
  console.log(`[api-gateway] HTTP + WebSocket corriendo en http://localhost:${config.port}`);
  console.log(`[api-gateway] WebSocket disponible en ws://localhost:${config.port}/ws`);
});
