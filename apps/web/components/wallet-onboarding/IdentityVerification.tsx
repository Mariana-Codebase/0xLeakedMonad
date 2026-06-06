"use client";

import { motion } from "framer-motion";
import { useEffect } from "react";
import { ParticleField } from "./ParticleField";

type Props = {
  address: string;
  onComplete: () => void;
};

export function IdentityVerification({ address, onComplete }: Props) {
  useEffect(() => {
    const timer = window.setTimeout(onComplete, 3800);
    return () => window.clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      key="verify"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, filter: "blur(20px)" }}
      transition={{ duration: 0.8 }}
      className="network-bg absolute inset-0 flex min-h-[100dvh] w-full items-center justify-center"
    >
      <div className="absolute inset-0 grid-mesh" />
      <ParticleField count={80} />

      <div className="relative flex flex-col items-center gap-10">
        <div className="relative h-64 w-64">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="ob-border-primary absolute inset-0 rounded-full border"
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: [0.4, 1.4], opacity: [0.8, 0] }}
              transition={{
                duration: 2.4,
                delay: i * 0.5,
                repeat: Infinity,
                ease: "easeOut"
              }}
            />
          ))}
          <motion.div
            className="glow-ring absolute inset-8 rounded-full backdrop-blur-sm"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          >
            <svg viewBox="0 0 100 100" className="ob-text-primary h-full w-full">
              <circle
                cx="50"
                cy="50"
                r="46"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.5"
                strokeDasharray="2 4"
                opacity="0.6"
              />
            </svg>
          </motion.div>
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.svg
              viewBox="0 0 24 24"
              className="ob-text-primary h-16 w-16"
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.4, type: "spring", damping: 12 }}
            >
              <path
                fill="currentColor"
                d="M12 2L3 6v6c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V6l-9-4z"
                opacity="0.2"
              />
              <path
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 2L3 6v6c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V6l-9-4z"
              />
              <motion.path
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 12l3 3 5-6"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: 1, duration: 0.8, ease: "easeInOut" }}
              />
            </motion.svg>
          </div>
        </div>

        <motion.div
          className="flex flex-col items-center gap-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          <div className="ob-text-muted text-xs uppercase tracking-[0.3em]">
            Verificando identidad
          </div>
          <div className="ob-text-primary ob-font-mono text-sm opacity-90">
            {address.slice(0, 6)}…{address.slice(-4)}
          </div>
          <div className="mt-4 flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="ob-bg-primary-muted h-1 w-12 overflow-hidden rounded-full"
              >
                <motion.div
                  className="ob-bg-primary h-full w-full"
                  initial={{ x: "-100%" }}
                  animate={{ x: "100%" }}
                  transition={{
                    duration: 1.4,
                    delay: i * 0.2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
