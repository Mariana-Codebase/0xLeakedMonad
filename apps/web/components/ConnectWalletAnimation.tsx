"use client";

import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

type ConnectWalletAnimationProps = {
  active: boolean;
  label?: string;
  onExitComplete?: () => void;
};

export function ConnectWalletAnimation({
  active,
  label = "Conectando con MetaMask...",
  onExitComplete
}: ConnectWalletAnimationProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence mode="wait" onExitComplete={onExitComplete}>
      {active && (
        <motion.div
          key="connect-wallet-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0a0a0f]/80 backdrop-blur-xl"
          aria-live="polite"
          aria-busy="true"
        >
          <motion.div
            initial={{ scale: 0, opacity: 0.8 }}
            animate={{ scale: 6, opacity: 0 }}
            transition={{ duration: 1.2, ease: "easeOut", repeat: Infinity }}
            className="absolute h-40 w-40 rounded-full border-2 border-[#836ef9]"
          />
          <motion.div
            initial={{ scale: 0, opacity: 0.5 }}
            animate={{ scale: 6, opacity: 0 }}
            transition={{ duration: 1.2, ease: "easeOut", repeat: Infinity, delay: 0.4 }}
            className="absolute h-40 w-40 rounded-full border-2 border-[#836ef9]"
          />
          <div className="relative z-10 text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[radial-gradient(circle,#f6851b,#c0560c)] text-3xl shadow-[0_0_40px_rgba(246,133,27,0.5)]"
            >
              🦊
            </motion.div>
            <p className="mt-5 tracking-wide text-white/80">{label}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
