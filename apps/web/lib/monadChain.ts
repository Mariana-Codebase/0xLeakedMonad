import { defineChain } from "viem";
import { appEnv } from "./env";

export const monadTestnet = defineChain({
  id: Number(appEnv.chainId),
  name: appEnv.monadChainName,
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: [appEnv.monadRpcUrl] },
    public: { http: [appEnv.monadRpcUrl] }
  },
  blockExplorers: {
    default: { name: "Monad Explorer", url: appEnv.monadExplorerUrl }
  },
  testnet: true
});
