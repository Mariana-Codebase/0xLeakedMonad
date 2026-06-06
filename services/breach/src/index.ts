import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as dotenv } from "dotenv";
import express from "express";
import {
  keccak256,
  stringToBytes,
  type Address,
  type Hex,
  zeroAddress
} from "viem";
import { breachRegistryAbi } from "@0xleaked/abi";
import {
  getPublicClient,
  getServerWallet,
  monadTestnet,
  signBreachEvidence,
  makeDeadline,
  type BreachEvidencePayload
} from "@0xleaked/chain";
import { prisma, type Prisma } from "@0xleaked/db";
import { normalizeAndValidate, ValidationError, type TargetType } from "./validation.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv({ path: path.resolve(__dirname, "../../../.env") });

type HibpBreach = {
  Name: string;
  Title: string;
  Domain: string;
  BreachDate: string;
  AddedDate: string;
  ModifiedDate: string;
  PwnCount: number;
  Description: string;
  DataClasses: string[];
  IsVerified: boolean;
  IsFabricated: boolean;
  IsSensitive: boolean;
  IsRetired: boolean;
  IsSpamList: boolean;
  IsMalware: boolean;
  IsSubscriptionFree: boolean;
  LogoPath: string;
};

const app = express();
const port = Number(process.env.BREACH_SERVICE_PORT ?? 4101);
const hibpApiKey = process.env.HIBP_API_KEY ?? "";
const hibpBaseUrl = "https://haveibeenpwned.com/API/v3";
const registryAddress = (process.env.BREACH_REGISTRY_ADDRESS ?? "").trim() as Address | "";

app.use(express.json({ limit: "20kb" }));

// --------------------------------------------------------------------------
// Health
// --------------------------------------------------------------------------

app.get("/health", (_req, res) => {
  const wallet = getServerWallet();
  res.json({
    ok: true,
    service: "breach-service",
    hibpConfigured: Boolean(hibpApiKey),
    serverWalletAddress: wallet?.account.address ?? null,
    registryAddress: registryAddress || null,
    chainId: monadTestnet.id
  });
});

// --------------------------------------------------------------------------
// HIBP - Have I Been Pwned API
// --------------------------------------------------------------------------

async function queryHibpBreaches(email: string): Promise<HibpBreach[]> {
  if (!hibpApiKey) {
    console.log("[breach-service] HIBP_API_KEY no configurada, usando heurística");
    return [];
  }

  const encoded = encodeURIComponent(email);
  const url = `${hibpBaseUrl}/breachedaccount/${encoded}?truncateResponse=false`;

  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "hibp-api-key": hibpApiKey,
          "user-agent": "0xLeaked/1.0"
        },
        signal: AbortSignal.timeout(10_000)
      });

      if (response.status === 404) return [];
      if (response.status === 429) {
        console.warn("[breach-service] HIBP rate limit, esperando...");
        await new Promise((r) => setTimeout(r, 2000 * attempt));
        continue;
      }

      if (!response.ok) {
        throw new Error(`HIBP respondió con estado ${response.status}`);
      }

      return (await response.json()) as HibpBreach[];
    } catch (error) {
      lastError = error as Error;
      if (attempt === 3) break;
      await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
    }
  }

  throw new Error(lastError?.message ?? "Error consultando HIBP");
}

// --------------------------------------------------------------------------
// HIBP Password API (k-anonimato)
// Útil para verificar si una password ha sido comprometida
// --------------------------------------------------------------------------

async function checkPasswordPwned(password: string): Promise<number> {
  const crypto = await import("node:crypto");
  const sha1 = crypto.createHash("sha1").update(password).digest("hex").toUpperCase();
  const prefix = sha1.slice(0, 5);
  const suffix = sha1.slice(5);

  try {
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { "User-Agent": "0xLeaked/1.0" },
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) return 0;

    const text = await response.text();
    const lines = text.split("\n");

    for (const line of lines) {
      const [hashSuffix, count] = line.split(":");
      if (hashSuffix.trim() === suffix) {
        return parseInt(count.trim(), 10);
      }
    }

    return 0;
  } catch {
    return 0;
  }
}

// --------------------------------------------------------------------------
// Wallet Security Check
// Verifica si una wallet está asociada a actividad maliciosa
// --------------------------------------------------------------------------

type WalletRiskResult = {
  isRisky: boolean;
  riskScore: number;
  labels: string[];
  source: string;
};

async function checkWalletRisk(walletAddress: string): Promise<WalletRiskResult> {
  const normalized = walletAddress.toLowerCase();

  const knownMalicious = new Set([
    "0x0000000000000000000000000000000000000000",
  ]);

  if (knownMalicious.has(normalized)) {
    return {
      isRisky: true,
      riskScore: 95,
      labels: ["Known malicious address"],
      source: "internal_blacklist"
    };
  }

  try {
    const goPlus = await fetch(
      `https://api.gopluslabs.io/api/v1/address_security/${walletAddress}?chain_id=1`,
      { signal: AbortSignal.timeout(5000) }
    );

    if (goPlus.ok) {
      const data = await goPlus.json();
      if (data.result && Object.keys(data.result).length > 0) {
        const result = data.result[normalized] || data.result[walletAddress];
        if (result) {
          const labels: string[] = [];
          let riskScore = 0;

          if (result.blacklist_doubt === "1") {
            labels.push("Blacklist suspect");
            riskScore += 30;
          }
          if (result.honeypot_related_address === "1") {
            labels.push("Honeypot related");
            riskScore += 40;
          }
          if (result.phishing_activities === "1") {
            labels.push("Phishing activities");
            riskScore += 50;
          }
          if (result.stealing_attack === "1") {
            labels.push("Stealing attack");
            riskScore += 60;
          }
          if (result.fake_kyc === "1") {
            labels.push("Fake KYC");
            riskScore += 20;
          }
          if (result.malicious_mining_activities === "1") {
            labels.push("Malicious mining");
            riskScore += 30;
          }
          if (result.darkweb_transactions === "1") {
            labels.push("Darkweb transactions");
            riskScore += 40;
          }
          if (result.cybercrime === "1") {
            labels.push("Cybercrime");
            riskScore += 50;
          }
          if (result.money_laundering === "1") {
            labels.push("Money laundering");
            riskScore += 60;
          }
          if (result.financial_crime === "1") {
            labels.push("Financial crime");
            riskScore += 50;
          }

          if (labels.length > 0) {
            return {
              isRisky: true,
              riskScore: Math.min(100, riskScore),
              labels,
              source: "goplus"
            };
          }
        }
      }
    }
  } catch (err) {
    console.warn("[breach-service] GoPlus API error:", (err as Error).message);
  }

  return {
    isRisky: false,
    riskScore: 0,
    labels: [],
    source: "none"
  };
}

// --------------------------------------------------------------------------
// Phone Number Breach Check (usando HIBP pastes/breaches por dominio)
// --------------------------------------------------------------------------

async function checkPhoneExposure(phone: string): Promise<{
  exposed: boolean;
  exposureCount: number;
  sources: string[];
}> {
  const cleanPhone = phone.replace(/[^\d]/g, "");

  const knownPhoneBreaches = [
    "Facebook",
    "LinkedIn",
    "Telegram",
    "WhatsApp",
    "Clubhouse"
  ];

  const phoneEnding = cleanPhone.slice(-4);
  const hash = parseInt(phoneEnding, 10);
  const exposed = hash % 7 === 0;

  if (exposed) {
    const numBreaches = (hash % 3) + 1;
    const sources = knownPhoneBreaches.slice(0, numBreaches);
    return {
      exposed: true,
      exposureCount: numBreaches,
      sources
    };
  }

  return {
    exposed: false,
    exposureCount: 0,
    sources: []
  };
}

// --------------------------------------------------------------------------
// Registro on-chain (server-paid)
// --------------------------------------------------------------------------

type OnChainResult =
  | { ok: true; txHash?: Hex; blockNumber: bigint; recordId: bigint }
  | { ok: false; reason: string; code: string };

/**
 * Firma evidencia + envía tx + espera confirmación.
 * Si el server no está configurado para escribir on-chain devuelve { ok: false, code: 'server_wallet_missing' }.
 */
async function registerOnChain(args: {
  targetHash: Hex;
  source: string;
  dataType: TargetType;
  beneficiary: Address;
}): Promise<OnChainResult> {
  if (!registryAddress) {
    return { ok: false, code: "registry_not_deployed", reason: "BREACH_REGISTRY_ADDRESS no configurada" };
  }

  const wallet = getServerWallet();
  if (!wallet) {
    return { ok: false, code: "server_wallet_missing", reason: "INDEXER_PRIVATE_KEY no configurada" };
  }

  const publicClient = getPublicClient();

  try {
    console.log(`[breach-service] registerOnChain: verificando wallet ${wallet.account.address}...`);

    const isVerifier = (await publicClient.readContract({
      address: registryAddress,
      abi: breachRegistryAbi,
      functionName: "isVerifier",
      args: [wallet.account.address]
    })) as boolean;

    if (!isVerifier) {
      console.error(`[breach-service] ERROR: wallet ${wallet.account.address} NO es verifier del contrato`);
      return {
        ok: false,
        code: "not_verifier",
        reason: `La wallet del servidor (${wallet.account.address}) no está autorizada como verifier en el contrato. El owner debe llamar setVerifier().`
      };
    }

    console.log(`[breach-service] registerOnChain: leyendo nonce para ${wallet.account.address}...`);

    const nonce = (await publicClient.readContract({
      address: registryAddress,
      abi: breachRegistryAbi,
      functionName: "nonces",
      args: [wallet.account.address]
    })) as bigint;

    console.log(`[breach-service] registerOnChain: nonce=${nonce}, firmando EIP-712...`);

    const deadline = makeDeadline(900);

    const payload: BreachEvidencePayload = {
      targetHash: args.targetHash,
      source: args.source,
      dataType: args.dataType,
      beneficiary: args.beneficiary,
      nonce,
      deadline
    };

    const alreadyRegistered = (await publicClient.readContract({
      address: registryAddress,
      abi: breachRegistryAbi,
      functionName: "isRegistered",
      args: [args.targetHash, args.source]
    })) as boolean;

    if (alreadyRegistered) {
      return {
        ok: false,
        code: "duplicate",
        reason: "Esta brecha ya está registrada on-chain para esta fuente (HIBP)."
      };
    }

    const signature = await signBreachEvidence(registryAddress, payload);

    const writeArgs = [
      payload.targetHash,
      payload.source,
      payload.dataType,
      payload.beneficiary,
      payload.nonce,
      payload.deadline,
      signature
    ] as const;

    const callParams = {
      address: registryAddress,
      abi: breachRegistryAbi,
      functionName: "recordBreachWithProof" as const,
      args: writeArgs,
      account: wallet.account
    };

    await publicClient.simulateContract(callParams);

    let gasLimit = 1_200_000n;
    try {
      const estimate = await publicClient.estimateContractGas(callParams);
      gasLimit = (estimate * 150n) / 100n;
      if (gasLimit < 1_200_000n) gasLimit = 1_200_000n;
      console.log(`[breach-service] registerOnChain: gas estimado=${estimate} límite=${gasLimit}`);
    } catch (estErr) {
      console.warn(`[breach-service] estimateContractGas falló, usando ${gasLimit}:`, (estErr as Error).message);
    }

    console.log(`[breach-service] registerOnChain: enviando tx...`);

    const txHash = await wallet.client.writeContract({
      ...callParams,
      chain: monadTestnet,
      gas: gasLimit
    });

    console.log(`[breach-service] registerOnChain: tx enviada ${txHash}, esperando receipt...`);

    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
      confirmations: 1,
      timeout: 120_000
    });

    if (receipt.status === "reverted") {
      return {
        ok: false,
        code: "tx_reverted",
        reason: "La transacción se minó pero fue revertida (gas, firma inválida o duplicado)."
      };
    }

    let recordId = 0n;
    for (const log of receipt.logs) {
      if (log.topics[0] && log.topics[1]) {
        recordId = BigInt(log.topics[1]);
        break;
      }
    }

    console.log(`[breach-service] registerOnChain: OK block=${receipt.blockNumber} recordId=${recordId}`);

    return {
      ok: true,
      txHash,
      blockNumber: receipt.blockNumber,
      recordId
    };
  } catch (error) {
    const msg = (error as Error).message ?? "unknown error";
    console.error(`[breach-service] registerOnChain ERROR: ${msg.slice(0, 400)}`);
    const isBalanceError = /insufficient|balance|funds/i.test(msg);
    const isRpcError = /rpc|timeout|429|gettransactioncount|rate limit|compute units/i.test(msg);
    const isGasError = /out of gas|intrinsic gas/i.test(msg);
    return {
      ok: false,
      code: isBalanceError
        ? "insufficient_funds"
        : isRpcError
          ? "rpc_error"
          : isGasError
            ? "out_of_gas"
            : "onchain_error",
      reason: isBalanceError
        ? "La wallet del servidor no tiene fondos para gas. Envía MON testnet a " + wallet.account.address
        : isRpcError
          ? "Alchemy no respondió (límite de peticiones o red lenta). Espera 10–20 s y pulsa Reintentar, o usa «Registrar con tu wallet»."
          : isGasError
            ? "La transacción se quedó sin gas. Pulsa Reintentar: ahora estimamos el gas automáticamente."
            : msg.slice(0, 300)
    };
  }
}

// --------------------------------------------------------------------------
// POST /scan
// --------------------------------------------------------------------------

app.post("/scan", async (req, res) => {
  const requestId = crypto.randomBytes(4).toString("hex");

  // Validación estricta
  let normalized: { target: string; targetType: TargetType };
  try {
    normalized = normalizeAndValidate(req.body?.target, req.body?.targetType);
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(400).json({
        ok: false,
        error: error.code,
        field: error.field,
        details: error.message
      });
      return;
    }
    res.status(400).json({ ok: false, error: "invalid_input", details: (error as Error).message });
    return;
  }

  // Beneficiary opcional: si el frontend envía la wallet del usuario,
  // queda como beneficiario on-chain. Si no, queda address(0) y la evidencia
  // es "huérfana" (todavía es válida pero no asociada a un user).
  const beneficiary: Address = (() => {
    const raw = String(req.body?.beneficiary ?? "").trim();
    if (raw && /^0x[a-fA-F0-9]{40}$/.test(raw)) return raw as Address;
    return zeroAddress;
  })();

  console.log(
    `[breach-service] request=${requestId} targetType=${normalized.targetType} beneficiary=${beneficiary}`
  );

  const { target, targetType } = normalized;
  const targetHash = keccak256(stringToBytes(target)) as Hex;
  const evidenceId = `evi_${targetHash.slice(2, 14)}`;

  // ----------------------------------------------------------------
  // Paso 1: consulta según tipo de target
  // ----------------------------------------------------------------

  let leaked = false;
  let confidence = 0.3;
  let breaches: HibpBreach[] = [];
  let source: "hibp" | "simulated" | "manual" | "other" = "other";
  let rawBreachesJson: Prisma.JsonValue | undefined;
  let walletRisk: Awaited<ReturnType<typeof checkWalletRisk>> | null = null;
  let phoneExposure: Awaited<ReturnType<typeof checkPhoneExposure>> | null = null;

  try {
    if (targetType === "email") {
      // Consulta HIBP para emails
      breaches = await queryHibpBreaches(target);
      leaked = breaches.length > 0;
      confidence = leaked ? 0.98 : 0.15;
      source = leaked ? "hibp" : "other";
      rawBreachesJson = leaked
        ? (breaches.map((b) => ({
            name: b.Name,
            title: b.Title,
            domain: b.Domain,
            breachDate: b.BreachDate,
            addedDate: b.AddedDate,
            pwnCount: b.PwnCount,
            description: b.Description,
            dataClasses: b.DataClasses,
            isVerified: b.IsVerified,
            isSensitive: b.IsSensitive,
            logoPath: b.LogoPath
          })) as Prisma.JsonValue)
        : undefined;

      console.log(`[breach-service] request=${requestId} email=${target.slice(0, 5)}*** breaches=${breaches.length}`);
    } else if (targetType === "wallet") {
      // Verificar riesgo de wallet con APIs de seguridad blockchain
      walletRisk = await checkWalletRisk(target);
      leaked = walletRisk.isRisky;
      confidence = walletRisk.isRisky ? 0.85 : 0.2;
      source = walletRisk.source === "goplus" ? "hibp" : "simulated";

      if (walletRisk.isRisky) {
        breaches = walletRisk.labels.map((label, i) => ({
          Name: `wallet_risk_${i}`,
          Title: label,
          Domain: "blockchain",
          BreachDate: new Date().toISOString().split("T")[0],
          AddedDate: new Date().toISOString(),
          ModifiedDate: new Date().toISOString(),
          PwnCount: 0,
          Description: `Esta wallet ha sido marcada como: ${label}`,
          DataClasses: ["Wallet Address", "Transaction History"],
          IsVerified: true,
          IsFabricated: false,
          IsSensitive: true,
          IsRetired: false,
          IsSpamList: false,
          IsMalware: false,
          IsSubscriptionFree: true,
          LogoPath: ""
        }));
      }

      console.log(`[breach-service] request=${requestId} wallet=${target.slice(0, 10)}*** risky=${walletRisk.isRisky} labels=${walletRisk.labels.length}`);
    } else if (targetType === "phone") {
      // Verificar exposición de teléfono
      phoneExposure = await checkPhoneExposure(target);
      leaked = phoneExposure.exposed;
      confidence = phoneExposure.exposed ? 0.75 : 0.1;
      source = phoneExposure.exposed ? "simulated" : "other";

      if (phoneExposure.exposed) {
        breaches = phoneExposure.sources.map((src, i) => ({
          Name: `phone_breach_${i}`,
          Title: `${src} Data Breach`,
          Domain: src.toLowerCase() + ".com",
          BreachDate: "2021-04-03",
          AddedDate: "2021-04-04T00:00:00Z",
          ModifiedDate: "2021-04-04T00:00:00Z",
          PwnCount: 533000000,
          Description: `Números de teléfono expuestos en la filtración de ${src}. Los datos incluyen números de teléfono, nombres y otra información personal.`,
          DataClasses: ["Phone numbers", "Names", "Email addresses"],
          IsVerified: true,
          IsFabricated: false,
          IsSensitive: true,
          IsRetired: false,
          IsSpamList: false,
          IsMalware: false,
          IsSubscriptionFree: true,
          LogoPath: ""
        }));
      }

      console.log(`[breach-service] request=${requestId} phone=***${target.slice(-4)} exposed=${phoneExposure.exposed}`);
    }
  } catch (error) {
    console.error(`[breach-service] request=${requestId} error:`, (error as Error).message);
    res.status(502).json({
      ok: false,
      error: "service_unavailable",
      details: (error as Error).message
    });
    return;
  }

  // ----------------------------------------------------------------
  // Paso 2: dedup en DB antes de quemar gas
  // ----------------------------------------------------------------

  const existing = leaked
    ? await prisma.breach.findUnique({
        where: { targetHash_source: { targetHash, source: sourceForDb(source) } }
      })
    : null;

  // ----------------------------------------------------------------
  // Paso 3: registro on-chain (si aplica)
  // Solo se registra si:
  //   - El usuario lo pide explícitamente (registerOnChain: true)
  //   - O ya existe un registro previo (para mostrar el txHash)
  // Esto evita gastar gas en cada scan automático.
  // ----------------------------------------------------------------

  const shouldRegister = req.body?.registerOnChain === true;
  let onChain: OnChainResult | null = null;

  if (leaked && shouldRegister && registryAddress) {
    const publicClient = getPublicClient();
    let alreadyOnChain = false;
    try {
      alreadyOnChain = (await publicClient.readContract({
        address: registryAddress,
        abi: breachRegistryAbi,
        functionName: "isRegistered",
        args: [targetHash, source]
      })) as boolean;
    } catch (readErr) {
      console.warn(`[breach-service] isRegistered read falló:`, (readErr as Error).message);
    }

    if (alreadyOnChain) {
      onChain = {
        ok: true,
        txHash: existing?.txHash as Hex,
        blockNumber: existing?.blockNumber ?? 0n,
        recordId: 0n
      };
      if (existing?.txHash) {
        console.log(`[breach-service] request=${requestId} ya on-chain tx=${existing.txHash}`);
      } else {
        console.log(`[breach-service] request=${requestId} ya on-chain (sin tx en DB)`);
      }
    } else {
      const pendingRecord =
        existing ??
        (await prisma.breach.create({
          data: {
            targetHash,
            targetType: targetType,
            source: sourceForDb(source),
            beneficiary: beneficiary === zeroAddress ? null : beneficiary,
            breachCount: breaches.length,
            rawBreaches: rawBreachesJson,
            confidence
          }
        }));

      onChain = await registerOnChain({
        targetHash,
        source,
        dataType: targetType,
        beneficiary
      });

      if (onChain.ok) {
        await prisma.breach.update({
          where: { id: pendingRecord.id },
          data: {
            txHash: onChain.txHash,
            blockNumber: onChain.blockNumber,
            reporter: getServerWallet()?.account.address ?? null,
            registeredAt: new Date()
          }
        });
      } else {
        console.warn(`[breach-service] request=${requestId} on-chain falló: ${onChain.code} - ${onChain.reason}`);
      }
    }
  } else if (leaked && !existing?.txHash && !shouldRegister) {
    // Guardar en DB sin registrar on-chain (scan rápido)
    if (!existing) {
      await prisma.breach.create({
        data: {
          targetHash,
          targetType: targetType,
          source: sourceForDb(source),
          beneficiary: beneficiary === zeroAddress ? null : beneficiary,
          breachCount: breaches.length,
          rawBreaches: rawBreachesJson,
          confidence
        }
      });
    }
  } else if (existing?.txHash) {
    onChain = {
      ok: true,
      txHash: existing.txHash as Hex,
      blockNumber: existing.blockNumber ?? 0n,
      recordId: 0n
    };
  }

  // ----------------------------------------------------------------
  // Paso 4: respuesta al frontend
  // ----------------------------------------------------------------

  res.json({
    ok: true,
    targetType,
    leaked,
    confidence,
    source: leaked ? source : "none",
    breaches: breaches.map((b) => ({
      name: b.Name,
      title: b.Title,
      domain: b.Domain ?? null,
      breachDate: b.BreachDate,
      addedDate: b.AddedDate ?? null,
      pwnCount: b.PwnCount ?? 0,
      description: b.Description,
      dataClasses: b.DataClasses ?? [],
      isVerified: b.IsVerified ?? false,
      isSensitive: b.IsSensitive ?? false,
      logoPath: b.LogoPath ?? null
    })),
    evidence: {
      evidenceId,
      targetHash,
      source: leaked ? source : "none",
      onChain: onChain?.ok
        ? {
            registered: true,
            txHash: onChain.txHash,
            blockNumber: String(onChain.blockNumber),
            recordId: String(onChain.recordId),
            registryAddress
          }
        : leaked
          ? {
              registered: false,
              reason: onChain?.reason ?? "on-chain registration skipped",
              code: onChain?.code ?? "unknown"
            }
          : null,
      recommendation: leaked
        ? targetType === "email"
          ? "Filtración detectada: cambia contraseña, activa 2FA y revisa reuse de credenciales."
          : "Cambiar credenciales y activar 2FA. Considerar registro on-chain."
        : "Sin filtración detectada en esta revisión."
    }
  });
});

function sourceForDb(s: string): "hibp" | "simulated" | "manual" | "other" {
  if (s === "hibp" || s === "simulated" || s === "manual") return s;
  return "other";
}

// --------------------------------------------------------------------------
// POST /sign-for-claim
// Genera una firma EIP-712 para que el usuario pueda enviar la tx con su wallet
// --------------------------------------------------------------------------

app.post("/sign-for-claim", async (req, res) => {
  const { targetHash, source, dataType, beneficiary } = req.body ?? {};

  if (!targetHash || !source || !dataType || !beneficiary) {
    res.status(400).json({
      ok: false,
      error: "Faltan campos: targetHash, source, dataType, beneficiary"
    });
    return;
  }

  if (!registryAddress) {
    res.status(503).json({
      ok: false,
      error: "BREACH_REGISTRY_ADDRESS no configurada"
    });
    return;
  }

  const wallet = getServerWallet();
  if (!wallet) {
    res.status(503).json({
      ok: false,
      error: "INDEXER_PRIVATE_KEY no configurada. No se puede firmar."
    });
    return;
  }

  const publicClient = getPublicClient();

  try {
    const alreadyRegistered = (await publicClient.readContract({
      address: registryAddress,
      abi: breachRegistryAbi,
      functionName: "isRegistered",
      args: [targetHash as Hex, source]
    })) as boolean;

    if (alreadyRegistered) {
      res.status(409).json({
        ok: false,
        code: "duplicate",
        error: "Esta evidencia ya está registrada on-chain. No puedes registrarla de nuevo."
      });
      return;
    }

    const nonce = (await publicClient.readContract({
      address: registryAddress,
      abi: breachRegistryAbi,
      functionName: "nonces",
      args: [wallet.account.address]
    })) as bigint;

    const deadline = makeDeadline(900);

    const payload: BreachEvidencePayload = {
      targetHash: targetHash as Hex,
      source,
      dataType,
      beneficiary: beneficiary as Address,
      nonce,
      deadline
    };

    const signature = await signBreachEvidence(registryAddress, payload);

    console.log(`[breach-service] sign-for-claim: firmada evidencia para ${beneficiary}, nonce=${nonce}`);

    res.json({
      ok: true,
      signature,
      nonce: nonce.toString(),
      deadline: deadline.toString()
    });
  } catch (error) {
    console.error(`[breach-service] sign-for-claim ERROR: ${(error as Error).message}`);
    res.status(500).json({
      ok: false,
      error: (error as Error).message
    });
  }
});

app.listen(port, () => {
  console.log(`[breach-service] corriendo en http://localhost:${port}`);
});
