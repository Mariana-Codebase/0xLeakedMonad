import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        warning: "#f59e0b",
        orange: "#f97316",
        cw: {
          bg: "#05070f",
          panel: "#0b1228",
          text: "#e5e7eb",
          muted: "#94a3b8",
          primary: "#4f46e5",
          accent: "#818cf8",
          cyan: "#22d3ee",
          electric: "#3a6fff",
          violet: "#8b5cf6",
          neon: "#5eead4",
          success: "#22c55e",
          danger: "#f87171",
          warning: "#f59e0b",
          border: "#1e293b"
        }
      },
      fontFamily: {
        display: ["Space Grotesk", "Inter", "sans-serif"],
        mono: ["JetBrains Mono", "Menlo", "monospace"],
        sans: ["Inter", "Segoe UI", "Roboto", "Arial", "sans-serif"]
      },
      boxShadow: {
        "cw-glow": "0 0 0 1px rgba(58,111,255,0.25), 0 20px 60px -20px rgba(58,111,255,0.45)",
        "cw-glow-strong":
          "0 0 0 1px rgba(94,234,212,0.35), 0 30px 80px -20px rgba(34,211,238,0.55)",
        "cw-card": "0 10px 40px -10px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)"
      },
      backgroundImage: {
        "cw-radial":
          "radial-gradient(1200px 600px at 50% -10%, rgba(58,111,255,0.25), transparent 60%), radial-gradient(900px 500px at 90% 10%, rgba(139,92,246,0.18), transparent 60%), radial-gradient(800px 600px at 10% 30%, rgba(34,211,238,0.12), transparent 60%)",
        "cw-grid":
          "linear-gradient(rgba(56,189,248,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.06) 1px, transparent 1px)",
        "cw-gradient-text":
          "linear-gradient(135deg,#ffffff 0%,#a8c7ff 35%,#5eead4 70%,#8b5cf6 100%)"
      },
      keyframes: {
        "cw-float": {
          "0%,100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" }
        },
        "cw-pulse-ring": {
          "0%": { transform: "scale(0.8)", opacity: "0.8" },
          "100%": { transform: "scale(2)", opacity: "0" }
        },
        "cw-shimmer": {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" }
        },
        "cw-marquee": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" }
        },
        "cw-aurora": {
          "0%,100%": { transform: "translate3d(0,0,0) scale(1)" },
          "33%": { transform: "translate3d(40px,-30px,0) scale(1.05)" },
          "66%": { transform: "translate3d(-30px,40px,0) scale(0.95)" }
        },
        "cw-spin-slow": {
          to: { transform: "rotate(360deg)" }
        },
        "cw-fade-up": {
          from: { opacity: "0", transform: "translateY(24px)" },
          to: { opacity: "1", transform: "translateY(0)" }
        },
        "cw-scan-line": {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" }
        },
        "cw-tick": {
          "0%,40%,100%": { opacity: "0.3" },
          "20%": { opacity: "1" }
        },
        "cw-blink": {
          "0%,49%": { opacity: "1" },
          "50%,100%": { opacity: "0" }
        },
        "cw-pulse-dot": {
          "0%,100%": { transform: "scale(1)", opacity: "1" },
          "50%": { transform: "scale(1.35)", opacity: "0.6" }
        },
        "cw-gradient-pan": {
          "0%,100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" }
        },
        "cw-bob": {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" }
        },
        "cw-ticker-slow": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" }
        }
      },
      animation: {
        "cw-float": "cw-float 6s ease-in-out infinite",
        "cw-pulse-ring": "cw-pulse-ring 2.4s ease-out infinite",
        "cw-shimmer": "cw-shimmer 6s linear infinite",
        "cw-marquee": "cw-marquee 38s linear infinite",
        "cw-aurora": "cw-aurora 18s ease-in-out infinite",
        "cw-spin-slow": "cw-spin-slow 22s linear infinite",
        "cw-fade-up": "cw-fade-up 0.8s ease forwards",
        "cw-scan-line": "cw-scan-line 3.5s linear infinite",
        "cw-tick": "cw-tick 1.4s ease-in-out infinite",
        "cw-blink": "cw-blink 1.1s steps(2,start) infinite",
        "cw-pulse-dot": "cw-pulse-dot 1.8s ease-in-out infinite",
        "cw-gradient-pan": "cw-gradient-pan 8s ease-in-out infinite",
        "cw-bob": "cw-bob 4.5s ease-in-out infinite",
        "cw-ticker-slow": "cw-ticker-slow 45s linear infinite"
      }
    }
  },
  plugins: []
};

export default config;
