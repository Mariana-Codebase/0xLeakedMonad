"use client";

import { useState } from "react";

const MODULES = [
  {
    id: "breach",
    title: "Breach Scanner",
    tagline: "Detecta si tus datos fueron filtrados",
    icon: ScanIcon,
    color: "#3a6fff",
    gradient: "from-[#3a6fff] to-[#60a5fa]",
    features: [
      "Consulta Have I Been Pwned (700M+ cuentas)",
      "Tu dato se hashea antes de enviarse",
      "Muestra qué información fue expuesta",
      "Fechas y fuentes de cada brecha"
    ],
    howItWorks: "Ingresas tu email → Se convierte en hash SHA-1 → Se consulta HIBP con k-anonimato → Ves resultados sin exponer tu dato.",
    onChainBenefit: "Si hay brecha, puedes registrar evidencia on-chain. El contrato guarda solo el hash de tu email + firma del servidor. Prueba verificable de que fuiste víctima, útil para reclamos o auditorías."
  },
  {
    id: "auditor",
    title: "Contract Auditor",
    tagline: "Analiza contratos inteligentes por riesgo",
    icon: AuditIcon,
    color: "#8b5cf6",
    gradient: "from-[#8b5cf6] to-[#a78bfa]",
    features: [
      "Análisis de bytecode en tiempo real",
      "Detecta SELFDESTRUCT y DELEGATECALL",
      "Score de riesgo 0-100",
      "Flags de patrones peligrosos"
    ],
    howItWorks: "Ingresas dirección del contrato → Se descarga el bytecode → Análisis heurístico busca opcodes riesgosos → Score + flags detallados.",
    onChainBenefit: "Si el riesgo es alto (≥70), el score se registra automáticamente en AlertOracle. Otros usuarios pueden consultar si un contrato ya fue marcado como peligroso."
  },
  {
    id: "vault",
    title: "Remediation Hub",
    tagline: "Protege tus fondos tras una alerta",
    icon: VaultIcon,
    color: "#10b981",
    gradient: "from-[#10b981] to-[#34d399]",
    features: [
      "Bóveda segura sin custodia",
      "Deposita MON mientras mitigas riesgos",
      "Retira cuando quieras",
      "Historial de transacciones"
    ],
    howItWorks: "Detectas riesgo → Mueves fondos al vault → Revocas approvals peligrosos → Verificas → Retiras de vuelta cuando esté limpio.",
    onChainBenefit: "Tus fondos van a un contrato auditable. Solo tú puedes retirar. No hay intermediarios ni llaves custodiadas."
  }
];

export function Modules() {
  const [activeModule, setActiveModule] = useState(MODULES[0].id);
  const active = MODULES.find((m) => m.id === activeModule) ?? MODULES[0];

  return (
    <section id="como-funciona" className="relative py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        {/* Section header */}
        <div className="cw-reveal text-center mb-16">
          <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-[#7f9bc9]">
            <span className="h-px w-8 bg-gradient-to-r from-transparent to-[#7f9bc9]/70" />
            Funcionalidades
            <span className="h-px w-8 bg-gradient-to-l from-transparent to-[#7f9bc9]/70" />
          </span>
          <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-white md:text-4xl">
            Tres módulos, un objetivo
          </h2>
          <p className="mt-4 text-lg text-[#94a3b8] max-w-2xl mx-auto">
            Cada herramienta cumple un rol específico en tu seguridad digital. 
            Sin signup, sin custodia, verificable on-chain.
          </p>
        </div>

        {/* Module tabs */}
        <div className="cw-reveal flex flex-wrap justify-center gap-3 mb-12">
          {MODULES.map((mod) => {
            const Icon = mod.icon;
            const isActive = mod.id === activeModule;
            return (
              <button
                key={mod.id}
                onClick={() => setActiveModule(mod.id)}
                className={`group relative flex items-center gap-3 rounded-xl px-5 py-3 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-white/10 text-white shadow-lg"
                    : "bg-white/[0.03] text-[#94a3b8] hover:bg-white/[0.06] hover:text-white"
                }`}
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                    isActive ? "bg-white/10" : "bg-white/5 group-hover:bg-white/10"
                  }`}
                  style={{ color: mod.color }}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <span>{mod.title}</span>
                {isActive && (
                  <span
                    className="absolute -bottom-px left-4 right-4 h-0.5 rounded-full"
                    style={{ background: mod.color }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Active module detail */}
        <div className="cw-reveal">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left: Features */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${active.gradient}`}
                >
                  <active.icon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">{active.title}</h3>
                  <p className="text-sm text-[#94a3b8]">{active.tagline}</p>
                </div>
              </div>

              <div className="space-y-3">
                {active.features.map((feature, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-4 py-3"
                  >
                    <div
                      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                      style={{ background: `${active.color}20`, color: active.color }}
                    >
                      <CheckIcon className="h-3 w-3" />
                    </div>
                    <span className="text-sm text-[#cfe0ff]">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: How it works + On-chain benefit */}
            <div className="space-y-6">
              {/* How it works */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#3a6fff]/10 text-[#3a6fff]">
                    <FlowIcon className="h-3.5 w-3.5" />
                  </div>
                  <h4 className="text-sm font-semibold text-white">Cómo funciona</h4>
                </div>
                <p className="text-sm leading-relaxed text-[#94a3b8]">
                  {active.howItWorks}
                </p>
              </div>

              {/* On-chain benefit */}
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.03] p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-400">
                    <ChainIcon className="h-3.5 w-3.5" />
                  </div>
                  <h4 className="text-sm font-semibold text-emerald-300">¿Por qué on-chain?</h4>
                </div>
                <p className="text-sm leading-relaxed text-[#94a3b8]">
                  {active.onChainBenefit}
                </p>
              </div>

              {/* Tech badges */}
              <div className="flex flex-wrap gap-2">
                <TechBadge>Monad EVM</TechBadge>
                <TechBadge>EIP-712 Signatures</TechBadge>
                {active.id === "breach" && <TechBadge>Have I Been Pwned API</TechBadge>}
                {active.id === "breach" && <TechBadge>k-Anonymity</TechBadge>}
                {active.id === "auditor" && <TechBadge>Bytecode Analysis</TechBadge>}
                {active.id === "vault" && <TechBadge>Non-custodial</TechBadge>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TechBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-[#94a3b8]">
      <span className="h-1.5 w-1.5 rounded-full bg-[#3a6fff]" />
      {children}
    </span>
  );
}

function ScanIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M11 8v6M8 11h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function AuditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 6h16M4 6v12a2 2 0 002 2h12a2 2 0 002-2V6M4 6l2-2h12l2 2" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function VaultIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="8" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M7 8V6a5 5 0 0110 0v2" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="14" r="2" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FlowIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M4 4h6v6H4zM14 14h6v6h-6z" stroke="currentColor" strokeWidth="2" />
      <path d="M10 7h4M14 17H10M7 10v4M17 10v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ChainIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
