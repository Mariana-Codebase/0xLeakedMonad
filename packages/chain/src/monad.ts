/**
 * Definición de la chain de Monad Testnet para viem.
 *
 * Usa lazy initialization porque los servicios que importan este módulo
 * cargan dotenv en su propio index.ts DESPUÉS de que los top-level
 * statements de este módulo se ejecutan. Si evaluamos process.env
 * al top-level, MONAD_RPC_URL aún no existe.
 */

import { defineChain, type Chain } from "viem";

let cachedChain: Chain | null = null;

export function getMonadTestnet(): Chain {
  if (cachedChain) return cachedChain;

  const rpcUrl =
    process.env.MONAD_RPC_URL ?? "https://monad-testnet.g.alchemy.com/v2/YOUR_KEY";

  const chainId = Number(process.env.MONAD_CHAIN_ID ?? 10143);

  const explorerUrl =
    process.env.MONAD_EXPLORER_URL ?? "https://testnet.monadexplorer.com";

  cachedChain = defineChain({
    id: chainId,
    name: "Monad Testnet",
    nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
    rpcUrls: {
      default: { http: [rpcUrl] },
      public: { http: [rpcUrl] }
    },
    blockExplorers: {
      default: { name: "MonadExplorer", url: explorerUrl }
    },
    testnet: true
  });

  return cachedChain;
}

// Backward compat: código que usa `monadTestnet` directamente.
// Es un proxy que resuelve a la cadena lazily.
export const monadTestnet = new Proxy({} as Chain, {
  get(_target, prop) {
    return (getMonadTestnet() as unknown as Record<string | symbol, unknown>)[prop];
  }
});

export function getMonadChainId(): number {
  return Number(process.env.MONAD_CHAIN_ID ?? 10143);
}

export const MONAD_CHAIN_ID = new Proxy({} as { valueOf: () => number }, {
  get(_target, prop) {
    if (prop === Symbol.toPrimitive || prop === "valueOf") {
      return () => getMonadChainId();
    }
    return getMonadChainId();
  }
}) as unknown as number;
