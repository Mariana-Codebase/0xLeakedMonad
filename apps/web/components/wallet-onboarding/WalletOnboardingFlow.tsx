"use client";

import { AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IdentityVerification } from "./IdentityVerification";
import { ParticleFieldIntro } from "./ParticleFieldIntro";
import { StatusReveal } from "./StatusReveal";
import "./onboarding.css";

type Step = "particles" | "identity" | "status";

type Props = {
  address: string;
  onComplete: () => void;
};

export function WalletOnboardingFlow({ address, onComplete }: Props) {
  const [step, setStep] = useState<Step>("particles");
  const [mounted, setMounted] = useState(false);
  const onCompleteRef = useRef(onComplete);

  onCompleteRef.current = onComplete;

  const handleComplete = useCallback(() => {
    onCompleteRef.current();
  }, []);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const fontLinkId = "wallet-onboarding-fonts";
    if (!document.getElementById(fontLinkId)) {
      const link = document.createElement("link");
      link.id = fontLinkId;
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Space+Grotesk:wght@300;700&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const goToIdentity = useCallback(() => setStep("identity"), []);
  const goToStatus = useCallback(() => setStep("status"), []);

  if (!mounted) return null;

  return createPortal(
    <div
      className="wallet-onboarding fixed inset-0 z-[110] h-[100dvh] w-screen overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Onboarding de wallet"
    >
      <AnimatePresence mode="wait">
        {step === "particles" && <ParticleFieldIntro key="particles" onComplete={goToIdentity} />}
        {step === "identity" && (
          <IdentityVerification key="identity" address={address} onComplete={goToStatus} />
        )}
        {step === "status" && <StatusReveal key="status" onComplete={handleComplete} />}
      </AnimatePresence>
    </div>,
    document.body
  );
}
