"use client";

import { createContext, useContext, type ReactNode } from "react";
import { ConnectWalletAnimation } from "../ConnectWalletAnimation";
import { WalletOnboardingFlow } from "../wallet-onboarding";
import { useLaunchAppFlow } from "../../lib/hooks/useLaunchAppFlow";

type LaunchAppContextValue = {
  launch: (onBeforeNavigate?: () => void) => void;
  isBusy: boolean;
};

const LaunchAppContext = createContext<LaunchAppContextValue | null>(null);

export function LaunchAppProvider({ children }: { children: ReactNode }) {
  const { launch, phase, isPending, address, onConnectAnimationExit, completeOnboarding } =
    useLaunchAppFlow();

  const isBusy = phase !== "idle";
  const showWalletAnimation = phase === "wallet-connect";
  const showOnboarding = phase === "onboarding" && Boolean(address);

  return (
    <LaunchAppContext.Provider value={{ launch, isBusy }}>
      {children}
      <ConnectWalletAnimation
        active={showWalletAnimation}
        onExitComplete={onConnectAnimationExit}
      />
      {showOnboarding && address && (
        <WalletOnboardingFlow address={address} onComplete={completeOnboarding} />
      )}
    </LaunchAppContext.Provider>
  );
}

export function useLaunchAppContext() {
  const ctx = useContext(LaunchAppContext);
  if (!ctx) {
    throw new Error("useLaunchAppContext must be used within LaunchAppProvider");
  }
  return ctx;
}
