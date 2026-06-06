"use client";

import { useAppKit } from "@reown/appkit/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAccount, useConnect } from "wagmi";
import { pickWalletConnector } from "../pickWalletConnector";

const PLATFORM_ROUTE = "/plataform";

export type LaunchPhase = "idle" | "wallet-connect" | "onboarding";

export function useLaunchAppFlow() {
  const router = useRouter();
  const { open } = useAppKit();
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const [phase, setPhase] = useState<LaunchPhase>("idle");
  const pendingOnboardingRef = useRef(false);
  const beforeNavigateRef = useRef<(() => void) | undefined>(undefined);
  const navigatingRef = useRef(false);

  const walletConnector = pickWalletConnector(connectors);

  const goToPlatform = useCallback(() => {
    if (navigatingRef.current) return;
    navigatingRef.current = true;

    beforeNavigateRef.current?.();
    beforeNavigateRef.current = undefined;
    pendingOnboardingRef.current = false;
    setPhase("idle");

    window.setTimeout(() => {
      router.push(PLATFORM_ROUTE);
      window.setTimeout(() => {
        if (window.location.pathname !== PLATFORM_ROUTE) {
          window.location.assign(PLATFORM_ROUTE);
        }
      }, 400);
    }, 150);
  }, [router]);

  const proceedToOnboarding = useCallback(() => {
    if (!address) return;
    pendingOnboardingRef.current = false;
    navigatingRef.current = false;
    setPhase("onboarding");
  }, [address]);

  const tryProceedToOnboarding = useCallback(() => {
    if (!pendingOnboardingRef.current) return;
    if (!isConnected || !address || isPending) return;
    proceedToOnboarding();
  }, [address, isConnected, isPending, proceedToOnboarding]);

  useEffect(() => {
    tryProceedToOnboarding();
  }, [tryProceedToOnboarding]);

  const onConnectAnimationExit = useCallback(() => {
    tryProceedToOnboarding();
  }, [tryProceedToOnboarding]);

  const completeOnboarding = useCallback(() => {
    goToPlatform();
  }, [goToPlatform]);

  const launch = useCallback(
    (onBeforeNavigate?: () => void) => {
      if (phase !== "idle") return;

      beforeNavigateRef.current = onBeforeNavigate;
      navigatingRef.current = false;
      pendingOnboardingRef.current = false;

      if (isConnected && address) {
        setPhase("onboarding");
        return;
      }

      setPhase("wallet-connect");

      if (walletConnector) {
        connect(
          { connector: walletConnector },
          {
            onSuccess: () => {
              pendingOnboardingRef.current = true;
              tryProceedToOnboarding();
            },
            onError: () => {
              pendingOnboardingRef.current = false;
              beforeNavigateRef.current = undefined;
              setPhase("idle");
            }
          }
        );
        return;
      }

      pendingOnboardingRef.current = true;
      open();
    },
    [address, connect, isConnected, open, phase, tryProceedToOnboarding, walletConnector]
  );

  return {
    launch,
    phase,
    isPending,
    address,
    onConnectAnimationExit,
    completeOnboarding
  };
}
