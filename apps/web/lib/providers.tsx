"use client";

import { createAppKit } from "@reown/appkit/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useRef, type ReactNode } from "react";
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

const WALLET_STORAGE_PREFIXES = [
  "wagmi",
  "wc@",
  "W3M",
  "@w3m",
  "@appkit",
  "@reown",
  "appkit",
  "reown"
];

function purgeWalletStorage() {
  try {
    for (const store of [localStorage, sessionStorage]) {
      const keys = Object.keys(store);
      for (const key of keys) {
        if (WALLET_STORAGE_PREFIXES.some((p) => key.startsWith(p))) {
          store.removeItem(key);
        }
      }
    }
  } catch {}
}

if (typeof window !== "undefined") {
  purgeWalletStorage();
}

createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks: [monadTestnet],
  defaultNetwork: monadTestnet,
  metadata,
  features: {
    analytics: false,
    email: false,
    socials: []
  },
  enableWalletConnect: true,
  enableInjected: true,
  enableEIP6963: false
});

function ClearWalletOnMount() {
  const cleared = useRef(false);

  useEffect(() => {
    if (cleared.current) return;
    cleared.current = true;
    purgeWalletStorage();
  }, []);

  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig} reconnectOnMount={false}>
      <QueryClientProvider client={queryClient}>
        <ClearWalletOnMount />
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
