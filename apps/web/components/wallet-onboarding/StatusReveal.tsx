"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

const items = [
  { label: "Wallet conectada", code: "0x01" },
  { label: "Identidad verificada", code: "0x02" },
  { label: "Acceso a la red concedido", code: "0x03" }
];

type Props = {
  onComplete: () => void;
};

export function StatusReveal({ onComplete }: Props) {
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      onCompleteRef.current();
    }, 3200);

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <motion.div
      key="status"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, filter: "blur(16px)" }}
      transition={{ duration: 0.8 }}
      className="network-bg absolute inset-0 flex min-h-[100dvh] w-full items-center justify-center"
    >
      <div className="absolute inset-0 grid-mesh" />
      <div className="relative flex flex-col gap-5">
        {items.map((it, i) => (
          <motion.div
            key={it.label}
            initial={{ opacity: 0, x: -30, filter: "blur(10px)" }}
            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            transition={{ delay: 0.4 + i * 0.55, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="ob-border-primary ob-bg-card flex items-center gap-4 rounded-xl border px-6 py-4 backdrop-blur-xl"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.6 + i * 0.55, type: "spring", damping: 10 }}
              className="ob-bg-primary-soft ob-text-primary flex h-8 w-8 items-center justify-center rounded-full"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3">
                <motion.path
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: 0.7 + i * 0.55, duration: 0.4 }}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 12l5 5L20 7"
                />
              </svg>
            </motion.div>
            <div className="flex flex-col">
              <span className="ob-text-muted ob-font-mono text-[10px] uppercase tracking-widest">
                {it.code}
              </span>
              <span className="text-lg font-medium tracking-tight">{it.label}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
