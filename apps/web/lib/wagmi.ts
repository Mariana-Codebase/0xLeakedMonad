"use client";

import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { metaMask, walletConnect } from "wagmi/connectors";
import { monadTestnet } from "./monadChain";

export const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID ?? "";
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "0xLeaked";
const appIconUrl = "https://avatars.githubusercontent.com/u/37784827";

const connectors =
  typeof window === "undefined"
    ? []
    : [
        metaMask({
          dappMetadata: {
            name: appName,
            url: appUrl,
            iconUrl: appIconUrl
          }
        }),
        walletConnect({ projectId })
      ];

export const wagmiAdapter = new WagmiAdapter({
  networks: [monadTestnet],
  projectId,
  connectors,
  ssr: true
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;
