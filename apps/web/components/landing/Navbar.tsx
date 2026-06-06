"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LaunchAppButton } from "./LaunchAppButton";

const links: Array<{ id: string; label: string }> = [
  { id: "producto", label: "Producto" },
  { id: "plataforma", label: "Plataforma" }
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled
          ? "border-b border-white/5 bg-[#05070f]/80 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-5 py-4 md:px-8">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#3a6fff] to-[#1e40af] transition-transform group-hover:rotate-6">
            <ShieldGlyph className="h-4 w-4 text-white" />
            <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.85)]" />
          </span>
          <span className="font-display text-base font-semibold tracking-tight text-white">
            0xLeaked
          </span>
          <span className="hidden font-mono text-[10px] text-[#5f78a9] sm:inline">
            v0.1 · alpha
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <a
              key={link.id}
              href={`#${link.id}`}
              className="rounded-lg px-3 py-1.5 text-sm text-[#a8b8d6] transition-colors hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <LaunchAppButton className="group inline-flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-1.5 text-sm font-medium text-[#05070f] transition-transform hover:scale-[1.02] disabled:pointer-events-none disabled:opacity-80">
            Lanzar app
            <ArrowIcon className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </LaunchAppButton>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] md:hidden"
          aria-label="Abrir menú"
        >
          <span className="flex flex-col gap-1">
            <span className="block h-[2px] w-4 bg-white/80" />
            <span className="block h-[2px] w-4 bg-white/80" />
            <span className="block h-[2px] w-4 bg-white/80" />
          </span>
        </button>
      </div>

      <div
        className={`overflow-hidden border-t border-white/5 bg-[#05070f]/95 backdrop-blur-xl transition-[max-height] duration-300 md:hidden ${
          open ? "max-h-96" : "max-h-0"
        }`}
      >
        <div className="flex flex-col px-5 py-3">
          {links.map((link) => (
            <a
              key={link.id}
              href={`#${link.id}`}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2 text-sm text-[#cfe0ff] hover:bg-white/5"
            >
              {link.label}
            </a>
          ))}
          <LaunchAppButton
            onBeforeNavigate={() => setOpen(false)}
            className="mt-2 w-full rounded-lg bg-white px-3 py-2 text-center text-sm font-medium text-[#05070f] disabled:pointer-events-none disabled:opacity-80"
          >
            Lanzar app
          </LaunchAppButton>
        </div>
      </div>
    </header>
  );
}

function ShieldGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M12 2.5 4 5.5v6c0 4.5 3.2 8.5 8 10 4.8-1.5 8-5.5 8-10v-6l-8-3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="m8.5 12 2.5 2.5 4.5-5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M5 12h14M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

