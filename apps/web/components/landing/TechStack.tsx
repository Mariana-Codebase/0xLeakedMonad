"use client";

const TECHNOLOGIES = [
  {
    name: "Monad",
    description: "Blockchain EVM Layer 1 de alto rendimiento. 10,000+ TPS con finalidad en 1 segundo.",
    logo: MonadLogo,
    color: "#8b5cf6",
    link: "https://monad.xyz"
  },
  {
    name: "MetaMask",
    description: "Wallet Web3 más utilizada. Conecta tu identidad descentralizada de forma segura.",
    logo: MetaMaskLogo,
    color: "#f6851b",
    link: "https://metamask.io"
  },
  {
    name: "Have I Been Pwned",
    description: "Base de datos de +700M cuentas filtradas. Verificación con k-anonimato para proteger tu privacidad.",
    logo: HIBPLogo,
    color: "#3a6fff",
    link: "https://haveibeenpwned.com"
  },
  {
    name: "EIP-712",
    description: "Estándar de firmas tipadas. Permite verificar datos estructurados de forma segura y legible.",
    logo: EIP712Logo,
    color: "#10b981",
    link: "https://eips.ethereum.org/EIPS/eip-712"
  },
  {
    name: "Alchemy",
    description: "Infraestructura RPC empresarial. Conexión fiable a Monad con baja latencia y alta disponibilidad.",
    logo: AlchemyLogo,
    color: "#0052ff",
    link: "https://alchemy.com"
  }
];

export function TechStack() {
  return (
    <section className="relative py-20 md:py-28 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#3a6fff]/5 to-transparent" />

      <div className="relative mx-auto max-w-6xl px-5 md:px-8">
        {/* Section header */}
        <div className="cw-reveal text-center mb-16">
          <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-[#7f9bc9]">
            <span className="h-px w-8 bg-gradient-to-r from-transparent to-[#7f9bc9]/70" />
            Stack Tecnológico
            <span className="h-px w-8 bg-gradient-to-l from-transparent to-[#7f9bc9]/70" />
          </span>
          <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-white md:text-4xl">
            Construido con lo mejor
          </h2>
          <p className="mt-4 text-lg text-[#94a3b8] max-w-2xl mx-auto">
            Tecnologías de vanguardia para máxima seguridad y rendimiento.
          </p>
        </div>

        {/* Tech cards */}
        <div className="cw-reveal grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {TECHNOLOGIES.map((tech, i) => (
            <a
              key={tech.name}
              href={tech.link}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative rounded-2xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur transition-all hover:border-white/20 hover:bg-white/[0.04] hover:-translate-y-1"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              {/* Glow on hover */}
              <div
                className="absolute inset-0 rounded-2xl opacity-0 blur-xl transition-opacity group-hover:opacity-30"
                style={{ background: tech.color }}
              />

              <div className="relative">
                {/* Logo */}
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-white/5 transition-transform group-hover:scale-110 group-hover:rotate-3">
                  <tech.logo className="h-10 w-10" color={tech.color} />
                </div>

                {/* Name */}
                <h3 className="text-lg font-semibold text-white mb-2">{tech.name}</h3>

                {/* Description */}
                <p className="text-sm text-[#94a3b8] leading-relaxed">
                  {tech.description}
                </p>

                {/* Link indicator */}
                <div className="mt-4 flex items-center gap-1.5 text-xs text-[#6f88b9] group-hover:text-[#3a6fff] transition-colors">
                  <span>Más info</span>
                  <svg className="h-3 w-3 transition-transform group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none">
                    <path d="M7 17L17 7M17 7H7M17 7v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            </a>
          ))}
        </div>

        {/* Additional info */}
        <div className="cw-reveal mt-12 text-center">
          <div className="inline-flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.02] px-6 py-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="text-sm text-[#94a3b8]">Código abierto</span>
            </div>
            <div className="h-4 w-px bg-white/10" />
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#3a6fff]" />
              <span className="text-sm text-[#94a3b8]">Contratos verificables</span>
            </div>
            <div className="h-4 w-px bg-white/10" />
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#8b5cf6]" />
              <span className="text-sm text-[#94a3b8]">Sin custodia</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function MonadLogo({ className, color }: { className?: string; color?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="20" r="18" stroke={color} strokeWidth="2" />
      <circle cx="20" cy="20" r="12" stroke={color} strokeWidth="2" />
      <circle cx="20" cy="20" r="6" fill={color} />
      <path d="M20 2v8M20 30v8M2 20h8M30 20h8" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function MetaMaskLogo({ className, color }: { className?: string; color?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none">
      <path d="M35 5L21 15l2.6-6.2L35 5z" fill={color} />
      <path d="M5 5l13.8 10.2-2.4-6.4L5 5z" fill={color} opacity="0.8" />
      <path d="M30 27l-3.7 5.7 7.9 2.2 2.3-7.8-6.5-.1z" fill={color} />
      <path d="M3.5 27.1l2.3 7.8 7.9-2.2L10 27l-6.5.1z" fill={color} opacity="0.8" />
      <path d="M13.3 17.5l-2.3 3.4 8 .4-.3-8.6-5.4 4.8z" fill={color} opacity="0.6" />
      <path d="M26.7 17.5l-5.5-4.9-.2 8.7 8-.4-2.3-3.4z" fill={color} opacity="0.6" />
      <path d="M13.7 32.7l4.8-2.4-4.2-3.2-.6 5.6z" fill={color} opacity="0.7" />
      <path d="M21.5 30.3l4.8 2.4-.6-5.6-4.2 3.2z" fill={color} opacity="0.7" />
    </svg>
  );
}

function HIBPLogo({ className, color }: { className?: string; color?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none">
      <path d="M20 4L6 10v10c0 8.8 5.6 16 14 17.6 8.4-1.6 14-8.8 14-17.6V10L20 4z" stroke={color} strokeWidth="2" fill="none" />
      <path d="M14 20l4 4 8-8" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="20" cy="20" r="8" stroke={color} strokeWidth="1.5" strokeDasharray="3 3" />
    </svg>
  );
}

function EIP712Logo({ className, color }: { className?: string; color?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none">
      <rect x="6" y="6" width="28" height="28" rx="4" stroke={color} strokeWidth="2" />
      <path d="M12 14h16M12 20h12M12 26h8" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <circle cx="30" cy="26" r="4" fill={color} />
      <path d="M28 26l1.5 1.5 3-3" stroke="#05070f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AlchemyLogo({ className, color }: { className?: string; color?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none">
      <polygon points="20,4 36,30 4,30" stroke={color} strokeWidth="2" fill="none" strokeLinejoin="round" />
      <polygon points="20,12 30,28 10,28" stroke={color} strokeWidth="1.5" fill="none" strokeLinejoin="round" />
      <circle cx="20" cy="22" r="3" fill={color} />
    </svg>
  );
}
