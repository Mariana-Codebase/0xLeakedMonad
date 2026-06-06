"use client";

import { useCallback, useEffect, useState } from "react";

type Options = {
  isConnected: boolean;
  address: string | undefined;
};

export function useWalletOnboarding({ isConnected, address }: Options) {
  const [connecting, setConnecting] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (!isConnected) {
      setConnecting(false);
      setShowOnboarding(false);
    }
  }, [isConnected]);

  useEffect(() => {
    if (!connecting || isConnected) return;

    const timer = window.setTimeout(() => setConnecting(false), 60000);
    return () => window.clearTimeout(timer);
  }, [connecting, isConnected]);

  const startConnect = useCallback(() => {
    if (connecting || showOnboarding) return false;

    if (isConnected && address) {
      setShowOnboarding(true);
      return true;
    }

    setConnecting(true);
    return true;
  }, [connecting, showOnboarding, isConnected, address]);

  const revealOnboarding = useCallback(() => {
    if (!address) return;
    setConnecting(false);
    setShowOnboarding(true);
  }, [address]);

  const dismissOnboarding = useCallback(() => {
    setShowOnboarding(false);
  }, []);

  const cancelConnect = useCallback(() => {
    setConnecting(false);
  }, []);

  return {
    connecting,
    showOnboarding,
    startConnect,
    revealOnboarding,
    dismissOnboarding,
    cancelConnect,
    setShowOnboarding
  };
}
