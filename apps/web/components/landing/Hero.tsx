"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const TECH_STACK = [
  { name: "Monad", desc: "EVM L1 de alto rendimiento", color: "#8b5cf6" },
  { name: "MetaMask", desc: "Wallet Web3 líder", color: "#f6851b" },
  { name: "Have I Been Pwned", desc: "Base de datos de brechas", color: "#3a6fff" },
  { name: "EIP-712", desc: "Firmas tipadas seguras", color: "#10b981" },
  { name: "Alchemy", desc: "Nodos RPC de alta disponibilidad", color: "#0052ff" }
];

export function Hero() {
  return (
    <section className="relative pt-28 pb-20 md:pt-40 md:pb-28 overflow-hidden">
      {/* Glow effects */}
      <div className="pointer-events-none absolute top-20 left-1/4 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-[#3a6fff]/10 blur-[120px]" />
      <div className="pointer-events-none absolute top-40 right-1/4 h-[400px] w-[400px] translate-x-1/2 rounded-full bg-[#8b5cf6]/10 blur-[100px]" />

      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          {/* Left: Text content */}
          <div className="cw-reveal text-center lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.05] px-4 py-1.5 text-xs tracking-wide text-emerald-200 backdrop-blur mb-6">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span>Live en Monad Testnet</span>
            </div>

            <h1 className="font-display text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl">
              Tu identidad digital
              <br />
              <span className="bg-gradient-to-r from-[#3a6fff] via-[#8b5cf6] to-[#3a6fff] bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
                protegida on-chain
              </span>
            </h1>

            <p className="mt-6 text-lg leading-relaxed text-[#94a3b8] max-w-xl mx-auto lg:mx-0">
              <strong className="text-white">0xLeaked</strong> verifica si tus datos fueron filtrados, 
              audita contratos inteligentes por riesgo, y registra evidencia 
              <strong className="text-[#3a6fff]"> inmutable en blockchain</strong>.
            </p>

            {/* Problem/Solution */}
            <div className="mt-8 p-4 rounded-xl border border-white/10 bg-white/[0.02] backdrop-blur text-left">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400">
                  <AlertIcon className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-medium text-rose-300">El problema</div>
                  <p className="mt-1 text-sm text-[#94a3b8]">
                    +26 mil millones de registros filtrados en 2024. Las víctimas no tienen prueba 
                    verificable de que fueron afectadas.
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                  <ShieldIcon className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-medium text-emerald-300">La solución</div>
                  <p className="mt-1 text-sm text-[#94a3b8]">
                    Registro on-chain con hash de tu dato + firma criptográfica del servidor. 
                    Prueba inmutable sin revelar tu información.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-3">
              <Link
                href="/platform"
                className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-[#3a6fff] to-[#8b5cf6] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#3a6fff]/25 transition-all hover:shadow-xl hover:shadow-[#3a6fff]/30 hover:scale-[1.02]"
              >
                <span>Lanzar App</span>
                <ArrowIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <a
                href="#como-funciona"
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-6 py-3 text-sm font-medium text-[#cfe0ff] transition-all hover:border-white/20 hover:bg-white/[0.06]"
              >
                <PlayIcon className="h-4 w-4" />
                Cómo funciona
              </a>
            </div>

            {/* Trust badges */}
            <div className="mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs text-[#6f88b9]">
              <span className="inline-flex items-center gap-1.5">
                <CheckIcon className="h-3.5 w-3.5 text-emerald-400" />
                Sin signup
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckIcon className="h-3.5 w-3.5 text-emerald-400" />
                Sin custodia
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckIcon className="h-3.5 w-3.5 text-emerald-400" />
                Código abierto
              </span>
            </div>
          </div>

          {/* Right: 3D Tech Stack visualization */}
          <div className="cw-reveal relative">
            <TechStackVisual />
          </div>
        </div>
      </div>
    </section>
  );
}

function TechStackVisual() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      setRotation({ x: y * 15, y: x * 15 });
    };

    const handleMouseLeave = () => setRotation({ x: 0, y: 0 });

    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative h-[400px] lg:h-[500px]" style={{ perspective: "1200px" }}>
      {/* Ambient glow behind the visual */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-72 w-72 rounded-full bg-[#3a6fff]/15 blur-[100px]" />
        <div className="absolute h-56 w-56 rounded-full bg-[#8b5cf6]/12 blur-[80px] translate-x-8 -translate-y-4" />
      </div>

      <div
        className="absolute inset-0 flex items-center justify-center transition-transform duration-500 ease-out"
        style={{
          transform: `rotateX(${-rotation.x}deg) rotateY(${rotation.y}deg)`,
          transformStyle: "preserve-3d",
        }}
      >
        <div className="relative h-64 w-64 lg:h-80 lg:w-80" style={{ transformStyle: "preserve-3d" }}>
          {/* Center logo with deeper shadow */}
          <div className="absolute inset-0 flex items-center justify-center" style={{ transform: "translateZ(40px)" }}>
            <div className="h-24 w-24 lg:h-32 lg:w-32 rounded-2xl bg-gradient-to-br from-[#3a6fff] to-[#8b5cf6] p-[2px] shadow-[0_0_60px_rgba(58,111,255,0.4),0_0_120px_rgba(139,92,246,0.2)]">
              <div className="flex h-full w-full items-center justify-center rounded-2xl bg-[#0a0f1c]">
                <LeakedLogo className="h-12 w-12 lg:h-16 lg:w-16 text-white drop-shadow-[0_0_12px_rgba(58,111,255,0.5)]" />
              </div>
            </div>
          </div>

          {/* Orbital rings */}
          <div className="absolute inset-0 animate-spin-slow rounded-full border border-dashed border-white/10" style={{ transform: "translateZ(10px)" }} />
          <div className="absolute inset-4 animate-spin-slow rounded-full border border-white/5" style={{ animationDirection: "reverse", animationDuration: "25s", transform: "translateZ(5px)" }} />

          {/* Tech badges orbiting with 3D depth */}
          {TECH_STACK.map((tech, i) => {
            const angle = (i * 360) / TECH_STACK.length;
            const radius = 130;
            const zDepth = 20 + Math.sin((angle * Math.PI) / 180) * 15;
            return (
              <div
                key={tech.name}
                className="absolute left-1/2 top-1/2 transition-transform duration-500"
                style={{
                  transform: `translate(-50%, -50%) rotate(${angle}deg) translateX(${radius}px) rotate(-${angle}deg) translateZ(${zDepth}px)`,
                }}
              >
                <TechBadge tech={tech} delay={i * 0.15} />
              </div>
            );
          })}
        </div>

        {/* Floating particles with glow */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(16)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full animate-float"
              style={{
                left: `${15 + Math.random() * 70}%`,
                top: `${15 + Math.random() * 70}%`,
                animationDelay: `${i * 0.25}s`,
                animationDuration: `${3 + Math.random() * 3}s`,
                width: `${2 + Math.random() * 3}px`,
                height: `${2 + Math.random() * 3}px`,
                background: i % 2 === 0 ? "#3a6fff" : "#8b5cf6",
                opacity: 0.3 + Math.random() * 0.3,
                boxShadow: `0 0 ${4 + Math.random() * 6}px currentColor`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function TechBadge({ tech, delay }: { tech: typeof TECH_STACK[0]; delay: number }) {
  return (
    <div
      className="group relative animate-fade-in-up"
      style={{ animationDelay: `${delay}s` }}
    >
      <div
        className="absolute -inset-1 rounded-xl opacity-40 blur-lg transition-opacity group-hover:opacity-75"
        style={{ background: tech.color }}
      />
      <div className="relative flex items-center gap-2 rounded-xl border border-white/10 bg-[#0a0f1c]/90 px-3 py-2 shadow-lg shadow-black/30 backdrop-blur transition-all hover:scale-110 hover:shadow-xl">
        <TechIcon name={tech.name} color={tech.color} />
        <div className="hidden sm:block">
          <div className="text-xs font-semibold text-white">{tech.name}</div>
          <div className="text-[10px] text-[#6f88b9] whitespace-nowrap">{tech.desc}</div>
        </div>
      </div>
    </div>
  );
}

function TechIcon({ name, color }: { name: string; color: string }) {
  const size = "h-6 w-6";
  
  switch (name) {
    case "Monad":
      return (
        <div className={`${size} rounded-md flex items-center justify-center`} style={{ background: color }}>
          <span className="text-white text-xs font-bold">M</span>
        </div>
      );
    case "MetaMask":
      return (
        <svg className={size} viewBox="0 0 35 33" fill="none">
          <path d="M32.9 1L19.4 11l2.5-5.9L32.9 1z" fill="#E17726"/>
          <path d="M2.1 1l13.4 10.1-2.4-6L2.1 1z" fill="#E27625"/>
          <path d="M28.2 23.5l-3.6 5.5 7.7 2.1 2.2-7.5-6.3-.1zM.5 23.6l2.2 7.5 7.7-2.1-3.6-5.5-6.3.1z" fill="#E27625"/>
          <path d="M10 14.5l-2.2 3.3 7.8.4-.3-8.4-5.3 4.7zM25 14.5l-5.4-4.8-.2 8.5 7.8-.4-2.2-3.3z" fill="#E27625"/>
          <path d="M10.4 29l4.7-2.3-4-3.2-.7 5.5zM19.9 26.7l4.7 2.3-.7-5.5-4 3.2z" fill="#E27625"/>
        </svg>
      );
    case "Have I Been Pwned":
      return (
        <div className={`${size} rounded-md flex items-center justify-center bg-[#3a6fff]`}>
          <span className="text-white text-[10px] font-bold">HIBP</span>
        </div>
      );
    case "EIP-712":
      return (
        <div className={`${size} rounded-md flex items-center justify-center`} style={{ background: color }}>
          <span className="text-white text-[10px] font-bold">712</span>
        </div>
      );
    case "Alchemy":
      return (
        <div className={`${size} rounded-md flex items-center justify-center`} style={{ background: color }}>
          <span className="text-white text-[10px] font-bold">⬡</span>
        </div>
      );
    default:
      return <div className={`${size} rounded bg-white/10`} />;
  }
}

function LeakedLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2L4 6v6c0 5.5 3.5 10 8 11 4.5-1 8-5.5 8-11V6l-8-4z"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
      <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 13v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M12 2L4 6v6c0 5.5 3.5 10 8 11 4.5-1 8-5.5 8-11V6l-8-4z" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <path d="M10 8l6 4-6 4V8z" fill="currentColor" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
