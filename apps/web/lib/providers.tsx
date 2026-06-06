"use client";

import { createAppKit } from "@reown/appkit/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { WagmiProvider } from "wagmi";
import { monadTestnet } from "./monadChain";
import { projectId, wagmiAdapter, wagmiConfig } from "./wagmi";

const queryClient = new QueryClient();

const metadata = {
  name: "0xLeaked",
  description: "Deteccion de brechas y evidencia on-chain en Monad",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  icons: ["https://avatars.githubusercontent.com/u/37784827"]
};

let appKitInitialized = false;

function initializeAppKit() {
  if (appKitInitialized) return;

  createAppKit({
    adapters: [wagmiAdapter],
    projectId,
    networks: [monadTestnet],
    defaultNetwork: monadTestnet,
    metadata,
    features: {
      analytics: false
    }
  });

  appKitInitialized = true;
}

function AppKitLazyInit() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/") {
      initializeAppKit();
    }
  }, [pathname]);

  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <AppKitLazyInit />
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
