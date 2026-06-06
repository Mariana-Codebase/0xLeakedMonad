"use client";

import { motion } from "framer-motion";
import { useEffect } from "react";
import { ParticleField } from "./ParticleField";

type Props = {
  onComplete: () => void;
};

export function ParticleFieldIntro({ onComplete }: Props) {
  useEffect(() => {
    const timer = window.setTimeout(onComplete, 2800);
    return () => window.clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      key="particles"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, filter: "blur(16px)" }}
      transition={{ duration: 0.8 }}
      className="network-bg absolute inset-0 flex min-h-[100dvh] w-full items-center justify-center"
    >
      <div className="absolute inset-0 grid-mesh" />
      <ParticleField count={100} />

      <motion.div
        className="relative flex flex-col items-center gap-4"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <motion.div
          className="h-16 w-16 rounded-full glow-ring"
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
        <p className="ob-text-muted text-xs uppercase tracking-[0.35em]">
          Inicializando red segura
        </p>
      </motion.div>
    </motion.div>
  );
}
