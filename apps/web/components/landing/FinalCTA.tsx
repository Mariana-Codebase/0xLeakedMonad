"use client";

import Link from "next/link";
import { LaunchAppButton } from "./LaunchAppButton";

export function FinalCTA() {
  return (
    <section className="relative py-24 md:py-32 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#3a6fff]/5 via-transparent to-transparent" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-[#3a6fff]/10 blur-[120px]" />

      <div className="relative mx-auto max-w-4xl px-5 text-center md:px-8">
        <div className="cw-reveal">
          <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-[#7f9bc9]">
            <span className="h-px w-8 bg-gradient-to-r from-transparent to-[#7f9bc9]/70" />
            Empieza ahora
            <span className="h-px w-8 bg-gradient-to-l from-transparent to-[#7f9bc9]/70" />
          </span>

          <h2 className="mt-6 font-display text-3xl font-bold tracking-tight text-white md:text-5xl">
            Tu seguridad digital
            <br />
            <span className="bg-gradient-to-r from-[#3a6fff] to-[#8b5cf6] bg-clip-text text-transparent">
              no puede esperar
            </span>
          </h2>

          <p className="mx-auto mt-6 max-w-xl text-lg text-[#94a3b8]">
            Cada día se filtran millones de registros. Verifica si tus datos están expuestos 
            y crea evidencia verificable en blockchain.
          </p>

          {/* Stats */}
          <div className="mt-10 grid grid-cols-3 gap-4 max-w-lg mx-auto">
            <StatCard value="700M+" label="Cuentas en HIBP" />
            <StatCard value="<3s" label="Tiempo de scan" />
            <StatCard value="0" label="Datos guardados" />
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <LaunchAppButton className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-[#3a6fff] to-[#8b5cf6] px-8 py-4 text-base font-semibold text-white shadow-lg shadow-[#3a6fff]/25 transition-all hover:shadow-xl hover:shadow-[#3a6fff]/30 hover:scale-[1.02] disabled:pointer-events-none disabled:opacity-80">
              <span>Lanzar App</span>
              <ArrowIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </LaunchAppButton>
          </div>

          {/* Trust indicators */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-[#6f88b9]">
            <span className="inline-flex items-center gap-2">
              <CheckIcon className="h-4 w-4 text-emerald-400" />
              Sin registro
            </span>
            <span className="inline-flex items-center gap-2">
              <CheckIcon className="h-4 w-4 text-emerald-400" />
              Sin custodia
            </span>
            <span className="inline-flex items-center gap-2">
              <CheckIcon className="h-4 w-4 text-emerald-400" />
              Código abierto
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 backdrop-blur">
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-[#6f88b9]">{label}</div>
    </div>
  );
}

const TEAM_MEMBERS = [
  {
    name: "Maicol",
    role: "Backend & Smart Contracts",
    desc: "Arquitectura del API Gateway, contratos Solidity y lógica on-chain.",
    initials: "MC",
  },
  {
    name: "Mariana",
    role: "Frontend & UX",
    desc: "Interfaz de usuario, diseño de experiencia y componentes React.",
    initials: "MA",
  },
  {
    name: "Jorge",
    role: "Security & Infrastructure",
    desc: "Infraestructura de nodos, auditoría de seguridad y despliegue.",
    initials: "JG",
  },
];

export function TeamSection() {
  return (
    <section className="relative py-20 md:py-28 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#8b5cf6]/5 to-transparent" />

      <div className="relative mx-auto max-w-6xl px-5 md:px-8">
        <div className="cw-reveal text-center mb-14">
          <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-[#7f9bc9]">
            <span className="h-px w-8 bg-gradient-to-r from-transparent to-[#7f9bc9]/70" />
            Equipo
            <span className="h-px w-8 bg-gradient-to-l from-transparent to-[#7f9bc9]/70" />
          </span>
          <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-white md:text-4xl">
            Equipo BusterCall
          </h2>
          <p className="mt-4 text-lg text-[#94a3b8] max-w-2xl mx-auto">
            Un equipo comprometido con la seguridad Web3 y la protección de identidades digitales.
          </p>
        </div>

        <div className="cw-reveal grid gap-6 sm:grid-cols-3 max-w-3xl mx-auto">
          {TEAM_MEMBERS.map((member) => (
            <div
              key={member.name}
              className="group relative rounded-2xl p-[1px] bg-gradient-to-br from-[#3a6fff]/40 via-[#8b5cf6]/30 to-[#3a6fff]/10 transition-all hover:from-[#3a6fff]/70 hover:via-[#8b5cf6]/50 hover:to-[#3a6fff]/30"
            >
              <div className="relative rounded-2xl bg-[#0a0f1c] p-6 h-full transition-transform group-hover:-translate-y-0.5">
                <div
                  className="absolute inset-0 rounded-2xl opacity-0 blur-xl transition-opacity group-hover:opacity-20"
                  style={{ background: "linear-gradient(135deg, #3a6fff, #8b5cf6)" }}
                />

                <div className="relative flex flex-col items-center text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#3a6fff] to-[#8b5cf6] shadow-lg shadow-[#3a6fff]/20">
                    <span className="text-lg font-bold text-white">{member.initials}</span>
                  </div>

                  <h3 className="mt-4 text-lg font-semibold text-white">{member.name}</h3>
                  <p className="mt-1 text-xs font-medium uppercase tracking-wider text-[#3a6fff]">
                    {member.role}
                  </p>
                  <p className="mt-3 text-sm text-[#94a3b8] leading-relaxed">
                    {member.desc}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="relative border-t border-white/5 py-10">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#3a6fff] to-[#8b5cf6]">
              <ShieldGlyph className="h-4 w-4 text-white" />
            </span>
            <div>
              <span className="font-display text-sm font-semibold text-white">0xLeaked</span>
              <span className="text-xs text-[#6f88b9]"> · Equipo BusterCall</span>
            </div>
          </div>

          <nav className="flex items-center gap-6 text-sm text-[#6f88b9]">
            <a href="#como-funciona" className="hover:text-white transition-colors">
              Cómo funciona
            </a>
            <Link href="/plataform" className="hover:text-white transition-colors">
              App
            </Link>
            <a
              href="https://monad.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-white transition-colors"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[#8b5cf6]" />
              Monad
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.02] px-3 py-1 text-xs text-[#6f88b9]">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              Live on Monad Testnet
            </span>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-8 md:flex-row">
          <p className="text-xs text-[#5f78a9]">
            © {new Date().getFullYear()} 0xLeaked · Equipo BusterCall. Proyecto open-source para la competencia de Monad.
          </p>
          <p className="text-xs text-[#5f78a9]">
            Construido con Next.js, Viem, Wagmi, Hardhat y mucho ☕
          </p>
        </div>
      </div>
    </footer>
  );
}

function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ShieldGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 2.5L4 5.5v6c0 4.5 3.2 8.5 8 10 4.8-1.5 8-5.5 8-10v-6l-8-3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M8.5 12l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
