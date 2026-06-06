import Anthropic from "@anthropic-ai/sdk";
import type { BytecodeAnalysis, ScoreResult, VerificationResult } from "./bytecodeAnalyzer.js";

const client = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY ?? process.env.ANTHROPIC_API_KEY,
});

export type AIAnalysisResult = {
  available: boolean;
  summary: string;
  vulnerabilities: AIVulnerability[];
  riskNarrative: string;
  sourceCodeAnalysis?: string;
};

export type AIVulnerability = {
  name: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  description: string;
  impact: string;
  recommendation: string;
};

const SYSTEM_PROMPT = `Eres un auditor experto en seguridad de smart contracts en Solidity/EVM con más de 10 años de experiencia. Tu rol es analizar contratos y explicar los riesgos de seguridad de forma clara y técnica, en español.

Reglas:
- Sé directo y técnico, pero comprensible para un desarrollador intermedio.
- Cada vulnerabilidad debe explicar QUÉ es, POR QUÉ es peligrosa, y CÓMO podría explotarse.
- Si el contrato tiene código fuente, analiza la lógica completa buscando reentrancia, overflow, manipulación de acceso, centralization risks, flash loan attacks, etc.
- No inventes vulnerabilidades que no existen en los datos proporcionados.
- Responde SIEMPRE en JSON válido, sin markdown ni bloques de código.`;

function buildBytecodePrompt(
  address: string,
  bytecode: BytecodeAnalysis,
  scoring: ScoreResult,
  verification: VerificationResult
): string {
  return `Analiza este contrato EVM y genera un informe de seguridad detallado.

DIRECCIÓN: ${address}
BYTECODE SIZE: ${bytecode.bytecodeSize} bytes
SCORE DE RIESGO: ${scoring.score}/100 (${scoring.label})

OPCODES DETECTADOS:
- SELFDESTRUCT: ${bytecode.hasSelfdestruct}
- DELEGATECALL: ${bytecode.hasDelegatecall}
- CALLCODE: ${bytecode.hasCallcode}
- CREATE2: ${bytecode.hasCreate2}
- tx.origin: ${bytecode.hasOrigin}
- TIMESTAMP: ${bytecode.hasBlockTimestamp}

PATRONES:
- Es proxy: ${bytecode.isProxy}
- Es minimal proxy (EIP-1167): ${bytecode.isMinimalProxy}
- Hidden mint detectado: ${bytecode.hasHiddenMint}
- Hidden fee detectado: ${bytecode.hasHiddenFee}
- Patrón honeypot en transfer: ${bytecode.hasSuspiciousTransfer}
- Bytecode vacío (EOA): ${bytecode.isEmpty}

VERIFICACIÓN:
- Verificado: ${verification.isVerified}
- Fuente: ${verification.source}
- Compilador: ${verification.compilerVersion ?? "desconocido"}

FLAGS DEL ANÁLISIS ESTÁTICO:
${scoring.flags.map(f => `- ${f}`).join("\n")}

Responde en JSON con esta estructura exacta:
{
  "summary": "Resumen ejecutivo de 2-3 oraciones sobre el estado de seguridad del contrato",
  "vulnerabilities": [
    {
      "name": "Nombre corto de la vulnerabilidad",
      "severity": "critical|high|medium|low|info",
      "description": "Explicación técnica detallada de qué es esta vulnerabilidad",
      "impact": "Qué podría pasar si se explota — impacto concreto en los fondos del usuario",
      "recommendation": "Qué debe hacer el usuario para protegerse"
    }
  ],
  "riskNarrative": "Explicación en lenguaje natural de 3-5 oraciones que resume todos los riesgos encontrados, explicando el escenario de ataque más probable y qué tan urgente es actuar"
}`;
}

function buildSourceCodePrompt(sourceCode: string, address: string): string {
  return `Analiza el código fuente de este smart contract en busca de vulnerabilidades de seguridad.

DIRECCIÓN: ${address}
CÓDIGO FUENTE:
${sourceCode}

Busca específicamente:
1. Reentrancia (llamadas externas antes de actualizar estado)
2. Manipulación de acceso (funciones admin sin protección, centralización excesiva)
3. Overflow/underflow (en versiones < 0.8.0 sin SafeMath)
4. Flash loan attacks (dependencia de balances instantáneos)
5. Front-running (operaciones sensibles al orden de transacciones)
6. Manipulación de oráculos de precio
7. Falta de validación de inputs
8. Storage collisions en proxies
9. Lógica de fees/taxes abusiva
10. Funciones de emergencia sin timelock

Responde en JSON con esta estructura exacta:
{
  "sourceCodeAnalysis": "Análisis narrativo detallado del código fuente (4-8 oraciones). Menciona funciones específicas y líneas si es relevante.",
  "vulnerabilities": [
    {
      "name": "Nombre de la vulnerabilidad",
      "severity": "critical|high|medium|low|info",
      "description": "Descripción técnica con referencia a funciones/líneas específicas del código",
      "impact": "Impacto concreto si se explota",
      "recommendation": "Mitigación recomendada"
    }
  ]
}`;
}

async function callClaude(systemPrompt: string, userPrompt: string): Promise<string> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const block = response.content.find(b => b.type === "text");
  return block?.text ?? "{}";
}

function parseAIResponse(raw: string): Record<string, unknown> {
  const cleaned = raw
    .replace(/```json\s*/g, "")
    .replace(/```\s*/g, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    return {};
  }
}

export async function runAIAnalysis(
  address: string,
  bytecode: BytecodeAnalysis,
  scoring: ScoreResult,
  verification: VerificationResult,
  sourceCode?: string
): Promise<AIAnalysisResult> {
  const apiKey = process.env.CLAUDE_API_KEY ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      available: false,
      summary: "Análisis de IA no disponible: CLAUDE_API_KEY no configurada.",
      vulnerabilities: [],
      riskNarrative: "",
    };
  }

  try {
    const bytecodePrompt = buildBytecodePrompt(address, bytecode, scoring, verification);
    const bytecodeRaw = await callClaude(SYSTEM_PROMPT, bytecodePrompt);
    const bytecodeResult = parseAIResponse(bytecodeRaw);

    const vulnerabilities: AIVulnerability[] = Array.isArray(bytecodeResult.vulnerabilities)
      ? (bytecodeResult.vulnerabilities as AIVulnerability[])
      : [];

    let sourceCodeAnalysis: string | undefined;

    if (sourceCode && sourceCode.length > 50) {
      const sourcePrompt = buildSourceCodePrompt(sourceCode, address);
      const sourceRaw = await callClaude(SYSTEM_PROMPT, sourcePrompt);
      const sourceResult = parseAIResponse(sourceRaw);

      sourceCodeAnalysis = (sourceResult.sourceCodeAnalysis as string) ?? undefined;

      if (Array.isArray(sourceResult.vulnerabilities)) {
        for (const v of sourceResult.vulnerabilities as AIVulnerability[]) {
          const exists = vulnerabilities.some(
            existing => existing.name.toLowerCase() === v.name.toLowerCase()
          );
          if (!exists) vulnerabilities.push(v);
        }
      }
    }

    return {
      available: true,
      summary: (bytecodeResult.summary as string) ?? "Análisis completado.",
      vulnerabilities,
      riskNarrative: (bytecodeResult.riskNarrative as string) ?? "",
      sourceCodeAnalysis,
    };
  } catch (error) {
    const msg = (error as Error).message ?? "Error desconocido";
    console.error("[ai-analyzer] Error en análisis de IA:", msg);
    return {
      available: false,
      summary: `Error en análisis de IA: ${msg.slice(0, 200)}`,
      vulnerabilities: [],
      riskNarrative: "",
    };
  }
}
