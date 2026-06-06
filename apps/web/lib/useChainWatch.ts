"use client";

import { useMemo } from "react";
import { useAccount, useConnect, useDisconnect, useSwitchChain, useWalletClient } from "wagmi";
import { monadTestnet } from "./monadChain";

export type LeakedErrorCode =
  | "wallet_not_connected"
  | "wrong_network"
  | "wallet_client_unavailable"
  | "wallet_not_ready"
  | "contract_not_configured"
  | "tx_rejected"
  | "tx_failed";

export type LeakedError = {
  code: LeakedErrorCode;
  message: string;
  hint?: string;
};

export const MONAD_CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 10143);

const ACCEPTED_MONAD_CHAIN_IDS = (() => {
  const raw = process.env.NEXT_PUBLIC_MONAD_CHAIN_IDS;
  const ids = raw
    ? raw.split(",").map((v) => Number(v.trim())).filter((n) => !Number.isNaN(n))
    : [MONAD_CHAIN_ID];
  return new Set<number>(ids);
})();

export function isAcceptedMonadChain(chainId?: number): boolean {
  if (chainId == null) return false;
  return ACCEPTED_MONAD_CHAIN_IDS.has(chainId);
}

export function useLeaked() {
  const { address, isConnected, chainId } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  const isMonadNetwork = isAcceptedMonadChain(chainId);
  const metaMaskConnector = connectors.find((c) => c.id === "metaMaskSDK" || c.id === "metaMask");

  const networkLabel = isMonadNetwork ? `Monad (${chainId ?? "?"})` : `Otra red (${chainId ?? "?"})`;

  const walletReadinessError = useMemo(() => {
    return function getWalletReadinessError(
      contractAddress: string | undefined
    ): LeakedError | null {
      if (!isConnected) {
        return {
          code: "wallet_not_connected",
          message: "Conecta tu wallet",
          hint: "Necesitas MetaMask o WalletConnect para registrar evidencia en Monad."
        };
      }
      if (!isMonadNetwork) {
        return {
          code: "wrong_network",
          message: "Cambia a la red Monad",
          hint: `Tu wallet está en chain ${chainId}. Pulsa el botón para cambiar.`
        };
      }
      if (!walletClient) {
        return {
          code: "wallet_client_unavailable",
          message: "Wallet no disponible",
          hint: "Reconecta MetaMask para continuar."
        };
      }
      if (!contractAddress) {
        return {
          code: "contract_not_configured",
          message: "Registro on-chain no disponible aún",
          hint: "El contrato BreachRegistry aún no está desplegado en esta red."
        };
      }
      return null;
    };
  }, [isConnected, isMonadNetwork, walletClient, chainId]);

  return {
    address,
    chainId,
    isConnected,
    isMonadNetwork,
    networkLabel,
    walletClient,
    metaMaskConnector,
    isConnecting,
    isSwitching,
    connect,
    disconnect,
    switchToMonad: () => switchChain({ chainId: monadTestnet.id }),
    walletReadinessError
  };
}
