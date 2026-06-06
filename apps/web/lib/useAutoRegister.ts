"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { keccak256, stringToBytes, type Address, type Hex } from "viem";
import { usePublicClient } from "wagmi";
import { breachRegistryAbi } from "@0xleaked/abi";
import type { BreachDashboardData } from "./breachDashboard";
import { parseChainError, writeBreachWithEstimatedGas } from "./chainTx";
import { useLeaked, type LeakedError } from "./useChainWatch";
import { monadTestnet } from "./monadChain";

export type AutoRegisterStatus =
  | "idle"
  | "server_registered"
  | "server_pending"
  | "blocked"
  | "signing"
  | "confirming"
  | "success"
  | "cancelled"
  | "error";

export type AutoRegisterState = {
  status: AutoRegisterStatus;
  countdown: number;
  txHash?: Hex;
  error?: LeakedError;
  message?: string;
  target?: string;
  explorerUrl?: string;
};

const GATEWAY_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL ?? "http://localhost:4000";
const EXPLORER_BASE = process.env.NEXT_PUBLIC_MONAD_EXPLORER_URL ?? "https://testnet.monadexplorer.com";

type SignatureResponse = {
  ok: boolean;
  signature?: string;
  nonce?: string;
  deadline?: string;
  error?: string;
  code?: string;
};

type Options = {
  contractAddress?: string;
  data: BreachDashboardData | null;
  enabled?: boolean;
  onRetryServerRegister?: () => Promise<void>;
};

export function useAutoRegister({
  contractAddress,
  data,
  enabled = true,
  onRetryServerRegister
}: Options) {
  const { address, walletClient, walletReadinessError } = useLeaked();
  const publicClient = usePublicClient();
  const [state, setState] = useState<AutoRegisterState>({
    status: "idle",
    countdown: 0
  });
  const busyRef = useRef(false);

  useEffect(() => {
    if (!enabled || !data) {
      setState({ status: "idle", countdown: 0 });
      return;
    }

    if (!data.leaked || !data.evidence) {
      setState({ status: "idle", countdown: 0 });
      return;
    }

    const onChain = data.evidence.onChain;

    if (onChain?.registered) {
      setState({
        status: "server_registered",
        countdown: 0,
        txHash: onChain.txHash as Hex | undefined,
        message: onChain.txHash
          ? "Evidencia ya registrada on-chain."
          : "Esta brecha ya está en el contrato.",
        target: data.target,
        explorerUrl: onChain.txHash ? `${EXPLORER_BASE}/tx/${onChain.txHash}` : undefined
      });
      return;
    }

    if (onChain && !onChain.registered) {
      setState({
        status: "server_pending",
        countdown: 0,
        message: onChain.reason ?? "El servidor no pudo registrar la evidencia on-chain.",
        target: data.target
      });
      return;
    }

    setState({
      status: "server_pending",
      countdown: 0,
      message: "Usa «Registrar on-chain» para guardar la evidencia con tu wallet.",
      target: data.target
    });
  }, [enabled, data]);

  const claimOwnership = useCallback(async () => {
    if (busyRef.current) return;
    if (!data?.leaked || !data.evidence) return;

    if (!walletClient || !address || !contractAddress || !publicClient) {
      setState((s) => ({
        ...s,
        status: "error",
        error: {
          code: "wallet_not_ready",
          message: "Wallet no disponible",
          hint: "Conecta tu wallet en Monad Testnet para registrar la evidencia."
        }
      }));
      return;
    }

    const readiness = walletReadinessError(contractAddress);
    if (readiness) {
      setState((s) => ({ ...s, status: "blocked", error: readiness }));
      return;
    }

    busyRef.current = true;
    setState((s) => ({ ...s, status: "signing", message: "Verificando estado on-chain…" }));

    try {
      const normalized = data.target.trim().toLowerCase();
      const targetHash = keccak256(stringToBytes(normalized));
      const source = data.evidence.source ?? "hibp";

      let alreadyOnChain = false;
      try {
        alreadyOnChain = (await publicClient.readContract({
          address: contractAddress as Address,
          abi: breachRegistryAbi,
          functionName: "isRegistered",
          args: [targetHash, source]
        })) as boolean;
      } catch { /* RPC fail — proceed anyway, server will check too */ }

      if (alreadyOnChain) {
        setState({
          status: "server_registered",
          countdown: 0,
          message: "Esta evidencia ya está registrada on-chain.",
          target: data.target
        });
        return;
      }

      setState((s) => ({ ...s, message: "Solicitando firma al servidor…" }));

      const sigRes = await fetch(`${GATEWAY_URL}/api/breach/sign-for-claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetHash,
          source,
          dataType: data.targetType,
          beneficiary: address
        })
      });

      const sigData = (await sigRes.json()) as SignatureResponse;

      if (!sigRes.ok || !sigData.ok) {
        if (sigData.code === "duplicate" || sigRes.status === 409) {
          setState({
            status: "server_registered",
            countdown: 0,
            message: "Esta evidencia ya está registrada on-chain.",
            target: data.target
          });
          return;
        }
        throw new Error(sigData.error ?? `Error ${sigRes.status} al obtener firma`);
      }

      if (!sigData.signature || !sigData.nonce || !sigData.deadline) {
        throw new Error("Respuesta inválida del servidor");
      }

      setState((s) => ({ ...s, message: "Confirma la transacción en tu wallet…" }));

      const hash = await writeBreachWithEstimatedGas({
        publicClient,
        walletClient,
        contractAddress: contractAddress as Address,
        abi: breachRegistryAbi,
        account: address as Address,
        chain: monadTestnet,
        args: [
          targetHash,
          source,
          data.targetType,
          address as Address,
          BigInt(sigData.nonce),
          BigInt(sigData.deadline),
          sigData.signature as Hex
        ]
      });

      setState((s) => ({
        ...s,
        status: "confirming",
        txHash: hash,
        message: "Esperando confirmación en Monad…",
        explorerUrl: `${EXPLORER_BASE}/tx/${hash}`
      }));

      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        confirmations: 1,
        timeout: 180_000
      });

      if (receipt.status === "reverted") {
        throw new Error("revert: La transacción fue revertida (duplicado, firma inválida o gas).");
      }

      setState({
        status: "success",
        countdown: 0,
        txHash: hash,
        message: "Evidencia registrada en Monad con tu wallet",
        target: data.target,
        explorerUrl: `${EXPLORER_BASE}/tx/${hash}`
      });
    } catch (err) {
      const raw = (err as Error).message ?? "Error desconocido";
      const rejected = /reject|denied|user/i.test(raw);
      const parsed = parseChainError(raw);

      setState((prev) => ({
        status: rejected ? "cancelled" : "error",
        countdown: 0,
        txHash: prev.txHash,
        explorerUrl: prev.explorerUrl,
        message: rejected ? "Firma cancelada por el usuario" : parsed.title,
        error: rejected
          ? undefined
          : { code: "tx_failed", message: parsed.title, hint: parsed.hint }
      }));
    } finally {
      busyRef.current = false;
    }
  }, [address, contractAddress, data, walletClient, publicClient, walletReadinessError]);

  const cancel = useCallback(() => {
    setState((s) => ({ ...s, status: "cancelled", countdown: 0, message: "Cancelado" }));
  }, []);

  const retry = useCallback(async () => {
    if (!data || busyRef.current) return;

    if (state.status === "server_pending" && onRetryServerRegister) {
      setState({
        status: "server_pending",
        countdown: 0,
        message: "Reintentando registro con el servidor…",
        target: data.target
      });
      await onRetryServerRegister();
      return;
    }

    if (state.status === "error" || state.status === "cancelled") {
      await claimOwnership();
      return;
    }

    if (onRetryServerRegister) {
      setState({
        status: "server_pending",
        countdown: 0,
        message: "Reintentando registro con el servidor…",
        target: data.target
      });
      await onRetryServerRegister();
      return;
    }

    setState({ status: "idle", countdown: 0 });
  }, [data, state.status, onRetryServerRegister, claimOwnership]);

  return { state, cancel, retry, claimOwnership };
}
