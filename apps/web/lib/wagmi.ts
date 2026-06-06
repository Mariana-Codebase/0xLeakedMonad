"use client";

import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { monadTestnet } from "./monadChain";

export const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID ?? "";

export const wagmiAdapter = new WagmiAdapter({
  networks: [monadTestnet],
  projectId,
  ssr: true
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;
