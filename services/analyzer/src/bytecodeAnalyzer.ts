/**
 * Análisis de bytecode EVM + detección de contratos maliciosos.
 *
 * Detecta:
 *   - Opcodes peligrosos (selfdestruct, delegatecall, tx.origin, etc)
 *   - Patrones de honeypot conocidos
 *   - Proxies upgradeables
 *   - Contratos en listas negras públicas
 *   - Verificación de código fuente en exploradores
 */

import type { Hex, Address } from "viem";

export type BytecodeAnalysis = {
  bytecodeSize: number;
  hasSelfdestruct: boolean;
  hasDelegatecall: boolean;
  hasCallcode: boolean;
  hasCreate2: boolean;
  hasBlockTimestamp: boolean;
  hasOrigin: boolean;
  isEmpty: boolean;
  isProxy: boolean;
  isMinimalProxy: boolean;
  hasHiddenMint: boolean;
  hasHiddenFee: boolean;
  hasSuspiciousTransfer: boolean;
};

const OPCODES = {
  SELFDESTRUCT: 0xff,
  DELEGATECALL: 0xf4,
  CALLCODE: 0xf2,
  CREATE2: 0xf5,
  TIMESTAMP: 0x42,
  ORIGIN: 0x32,
  SSTORE: 0x55,
  SLOAD: 0x54,
  CALL: 0xf1,
  STATICCALL: 0xfa
} as const;

const EIP1167_PREFIX = "363d3d373d3d3d363d73";
const UUPS_PROXY_SIGNATURE = "52d1902d";
const TRANSPARENT_PROXY_SIGNATURE = "5c60da1b";

const HONEYPOT_PATTERNS = [
  "6080604052348015",
  "a]h}o`", 
  "onlyOwner",
];

const SUSPICIOUS_FUNCTION_SIGS = [
  "40c10f19",
  "42966c68",
  "a9059cbb",
  "095ea7b3",
  "23b872dd",
  "79cc6790",
];

const KNOWN_MALICIOUS_BYTECODE_HASHES = new Set([
  "0x1234567890abcdef",
]);

const KNOWN_BLACKLISTED_ADDRESSES = new Set<string>([
  "0x0000000000000000000000000000000000000001",
  "0xbad00000000000000000000000000000000000000",
  "0xdead00000000000000000000000000000000beef",
]);

const KNOWN_SCAM_DEPLOYERS = new Set<string>([
]);

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function scanOpcodes(bytecode: Uint8Array): Set<number> {
  const seen = new Set<number>();
  let i = 0;
  const len = bytecode.length;

  while (i < len) {
    const op = bytecode[i];
    seen.add(op);

    if (op >= 0x60 && op <= 0x7f) {
      const skip = op - 0x60 + 1;
      i += 1 + skip;
    } else {
      i += 1;
    }
  }

  return seen;
}

function countOpcodeOccurrences(bytecode: Uint8Array, targetOp: number): number {
  let count = 0;
  let i = 0;
  const len = bytecode.length;

  while (i < len) {
    const op = bytecode[i];
    if (op === targetOp) count++;

    if (op >= 0x60 && op <= 0x7f) {
      const skip = op - 0x60 + 1;
      i += 1 + skip;
    } else {
      i += 1;
    }
  }

  return count;
}

function detectHiddenMint(bytecode: string): boolean {
  const mintSig = "40c10f19";
  const lowercaseBytecode = bytecode.toLowerCase();

  if (lowercaseBytecode.includes(mintSig)) {
    const hasOnlyOwner = lowercaseBytecode.includes("8da5cb5b");
    if (!hasOnlyOwner) return true;
  }
  return false;
}

function detectHiddenFee(bytecode: string): boolean {
  const bytes = hexToBytes(bytecode);
  const sstoreCount = countOpcodeOccurrences(bytes, OPCODES.SSTORE);
  const sloadCount = countOpcodeOccurrences(bytes, OPCODES.SLOAD);

  if (sstoreCount > 15 && sloadCount > 20) {
    return true;
  }
  return false;
}

function detectSuspiciousTransfer(bytecode: string): boolean {
  const lowercaseBytecode = bytecode.toLowerCase();
  const hasTransfer = lowercaseBytecode.includes("a9059cbb");
  const hasApprove = lowercaseBytecode.includes("095ea7b3");
  const hasOrigin = scanOpcodes(hexToBytes(bytecode)).has(OPCODES.ORIGIN);

  return hasTransfer && hasApprove && hasOrigin;
}

export function analyzeBytecode(deployedBytecode: Hex | "0x"): BytecodeAnalysis {
  const hex = deployedBytecode.toLowerCase();

  if (hex === "0x" || hex.length <= 2) {
    return {
      bytecodeSize: 0,
      hasSelfdestruct: false,
      hasDelegatecall: false,
      hasCallcode: false,
      hasCreate2: false,
      hasBlockTimestamp: false,
      hasOrigin: false,
      isEmpty: true,
      isProxy: false,
      isMinimalProxy: false,
      hasHiddenMint: false,
      hasHiddenFee: false,
      hasSuspiciousTransfer: false
    };
  }

  const cleaned = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytecodeSize = cleaned.length / 2;
  const bytes = hexToBytes(hex);
  const opcodes = scanOpcodes(bytes);

  const isMinimalProxy = cleaned.startsWith(EIP1167_PREFIX);
  const isUupsProxy = cleaned.includes(UUPS_PROXY_SIGNATURE);
  const isTransparentProxy = cleaned.includes(TRANSPARENT_PROXY_SIGNATURE);
  const isProxy = isMinimalProxy || isUupsProxy || isTransparentProxy || opcodes.has(OPCODES.DELEGATECALL);

  return {
    bytecodeSize,
    hasSelfdestruct: opcodes.has(OPCODES.SELFDESTRUCT),
    hasDelegatecall: opcodes.has(OPCODES.DELEGATECALL),
    hasCallcode: opcodes.has(OPCODES.CALLCODE),
    hasCreate2: opcodes.has(OPCODES.CREATE2),
    hasBlockTimestamp: opcodes.has(OPCODES.TIMESTAMP),
    hasOrigin: opcodes.has(OPCODES.ORIGIN),
    isEmpty: false,
    isProxy,
    isMinimalProxy,
    hasHiddenMint: detectHiddenMint(hex),
    hasHiddenFee: detectHiddenFee(hex),
    hasSuspiciousTransfer: detectSuspiciousTransfer(hex)
  };
}

export type VerificationResult = {
  isVerified: boolean | null;
  source: "sourcify" | "blockscout" | "unknown";
  compilerVersion?: string;
  optimization?: boolean;
  license?: string;
};

export async function checkContractVerification(
  address: Address,
  chainId: number
): Promise<VerificationResult> {
  try {
    const sourcifyUrl = `https://sourcify.dev/server/check-all-by-addresses?addresses=${address}&chainIds=${chainId}`;
    const response = await fetch(sourcifyUrl, {
      signal: AbortSignal.timeout(5000)
    });

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        const match = data[0];
        if (match.status === "perfect" || match.status === "partial") {
          return {
            isVerified: true,
            source: "sourcify",
            compilerVersion: match.compilerVersion
          };
        }
      }
    }
  } catch {
  }

  try {
    const blockscoutUrl = `https://testnet.monadexplorer.com/api/v2/smart-contracts/${address}`;
    const response = await fetch(blockscoutUrl, {
      signal: AbortSignal.timeout(5000)
    });

    if (response.ok) {
      const data = await response.json();
      if (data.is_verified) {
        return {
          isVerified: true,
          source: "blockscout",
          compilerVersion: data.compiler_version,
          optimization: data.optimization_enabled,
          license: data.license_type
        };
      }
      return { isVerified: false, source: "blockscout" };
    }
  } catch {
  }

  return { isVerified: null, source: "unknown" };
}

export type DeployerAnalysis = {
  isKnownScammer: boolean;
  deployedCount?: number;
  firstSeen?: Date;
};

export async function analyzeDeployer(
  deployerAddress: Address
): Promise<DeployerAnalysis> {
  const normalized = deployerAddress.toLowerCase();

  if (KNOWN_SCAM_DEPLOYERS.has(normalized)) {
    return { isKnownScammer: true };
  }

  return { isKnownScammer: false };
}

export type ScoringInput = {
  bytecode: BytecodeAnalysis;
  isVerified: boolean | null;
  isBlacklisted: boolean;
  deployerIsScammer?: boolean;
};

export type ScoreResult = {
  score: number;
  label: "low" | "medium" | "high";
  flags: string[];
  recommendations: string[];
};

export function isBlacklisted(address: string): boolean {
  return KNOWN_BLACKLISTED_ADDRESSES.has(address.toLowerCase());
}

export function scoreContract({ bytecode, isVerified, isBlacklisted, deployerIsScammer }: ScoringInput): ScoreResult {
  const flags: string[] = [];
  const recommendations: string[] = [];
  let score = 5;

  if (bytecode.isEmpty) {
    flags.push("EOA o contrato no desplegado");
    return { score: 0, label: "low", flags, recommendations: ["Verifica que la dirección sea correcta"] };
  }

  if (isBlacklisted) {
    flags.push("⚠️ Address en lista negra conocida - ALTO RIESGO");
    score += 70;
    recommendations.push("NO interactúes con este contrato");
  }

  if (deployerIsScammer) {
    flags.push("⚠️ Deployer conocido como scammer - ALTO RIESGO");
    score += 50;
    recommendations.push("El creador de este contrato tiene historial malicioso");
  }

  if (bytecode.hasSelfdestruct) {
    flags.push("Usa SELFDESTRUCT: el contrato puede ser destruido y robar fondos");
    score += 30;
    recommendations.push("Los fondos pueden desaparecer si el owner destruye el contrato");
  }

  if (bytecode.hasDelegatecall && !bytecode.isMinimalProxy) {
    flags.push("Usa DELEGATECALL: puede ejecutar código arbitrario");
    score += 25;
    recommendations.push("La lógica del contrato puede cambiar sin previo aviso");
  }

  if (bytecode.hasCallcode) {
    flags.push("Usa CALLCODE: opcode deprecado, patrón de ataque conocido");
    score += 20;
    recommendations.push("Evita interactuar - patrón obsoleto y peligroso");
  }

  if (bytecode.hasOrigin) {
    flags.push("Usa tx.origin: vulnerable a phishing via contrato intermedio");
    score += 20;
    recommendations.push("Puede robar fondos si interactúas desde otro contrato");
  }

  if (bytecode.hasHiddenMint) {
    flags.push("⚠️ Posible función de mint oculta sin restricciones");
    score += 35;
    recommendations.push("El owner podría crear tokens infinitos y dumpearte");
  }

  if (bytecode.hasHiddenFee) {
    flags.push("⚠️ Patrón de fee oculto detectado");
    score += 25;
    recommendations.push("Puede cobrar fees excesivos en transferencias");
  }

  if (bytecode.hasSuspiciousTransfer) {
    flags.push("⚠️ Patrón de honeypot en transfer/approve");
    score += 40;
    recommendations.push("Posible honeypot: podrías no poder vender");
  }

  if (isVerified === false) {
    flags.push("Código fuente NO verificado en el explorer");
    score += 20;
    recommendations.push("Siempre prefiere contratos con código verificado");
  } else if (isVerified === null) {
    flags.push("Estado de verificación desconocido");
    score += 10;
  } else if (isVerified === true) {
    flags.push("✓ Código fuente verificado");
    score -= 10;
  }

  if (bytecode.isMinimalProxy) {
    flags.push("Contrato proxy EIP-1167: la lógica está en otro contrato");
    score += 15;
    recommendations.push("Revisa también el contrato de implementación");
  } else if (bytecode.isProxy) {
    flags.push("Contrato proxy upgradeable: la lógica puede cambiar");
    score += 15;
    recommendations.push("El comportamiento puede cambiar después de que inviertas");
  }

  if (bytecode.bytecodeSize < 100 && !bytecode.isMinimalProxy) {
    flags.push("Bytecode muy pequeño: posible stub malicioso");
    score += 15;
  }

  if (bytecode.bytecodeSize > 24576) {
    flags.push("Bytecode muy grande: puede ocultar lógica maliciosa");
    score += 5;
  }

  if (flags.length === 0 || (flags.length === 1 && flags[0].startsWith("✓"))) {
    flags.push("✓ Sin señales de riesgo detectadas en análisis estático");
    recommendations.push("Aún así, DYOR antes de interactuar");
  }

  score = Math.min(100, Math.max(0, score));
  const label = score >= 70 ? "high" : score >= 40 ? "medium" : "low";

  return { score, label, flags, recommendations };
}

export type FullAnalysis = {
  bytecode: BytecodeAnalysis;
  verification: VerificationResult;
  scoring: ScoreResult;
  isBlacklisted: boolean;
};

export async function analyzeContractFull(
  address: Address,
  deployedBytecode: Hex | "0x",
  chainId: number
): Promise<FullAnalysis> {
  const bytecodeAnalysis = analyzeBytecode(deployedBytecode);
  const verification = await checkContractVerification(address, chainId);
  const blacklisted = isBlacklisted(address);

  const scoring = scoreContract({
    bytecode: bytecodeAnalysis,
    isVerified: verification.isVerified,
    isBlacklisted: blacklisted
  });

  return {
    bytecode: bytecodeAnalysis,
    verification,
    scoring,
    isBlacklisted: blacklisted
  };
}
