"use client";

import { AnimatedBackground } from "./AnimatedBackground";
import { Navbar } from "./Navbar";
import { Hero } from "./Hero";
import { Modules } from "./Modules";
import { TechStack } from "./TechStack";
import { Preview } from "./Preview";
import { FinalCTA, TeamSection, Footer } from "./FinalCTA";
import { useReveal } from "./useReveal";

export function LeakedLanding() {
  useReveal();

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#05070f] text-white">
      <AnimatedBackground />
      <Navbar />

      <main className="relative z-10">
        <Hero />
        <Modules />
        <TechStack />
        <Preview />
        <FinalCTA />
        <TeamSection />
      </main>

      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  );
}
