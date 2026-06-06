"use client";

import { useAppKit } from "@reown/appkit/react";
import { useLeaked } from "../../lib/useChainWatch";

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function DashboardWalletChip() {
  const {
    address,
    isConnected,
    chainId,
    isMonadNetwork,
    metaMaskConnector,
    isConnecting,
    isSwitching,
    connect,
    disconnect,
    switchToMonad
  } = useLeaked();
  const { open } = useAppKit();

  if (!isConnected) {
    return (
      <div className="flex gap-2">
        <button
          type="button"
          className="cw-btn-ghost"
          disabled={isConnecting || !metaMaskConnector}
          onClick={() => metaMaskConnector && connect({ connector: metaMaskConnector })}
        >
          MetaMask
        </button>
        <button type="button" className="cw-btn" onClick={() => open()}>
          Conectar
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5">
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          isMonadNetwork ? "bg-emerald-400" : "bg-rose-400"
        }`}
      />
      <div className="flex flex-col">
        <span className="font-mono text-xs text-white">{shortAddress(address!)}</span>
        <span className="text-[10px] text-[#6f88b9]">
          {isMonadNetwork ? "Monad" : `Red ${chainId ?? "?"}`}
        </span>
      </div>
      {!isMonadNetwork && (
        <button
          type="button"
          className="rounded-md border border-white/10 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-[#cfe0ff] transition-colors hover:border-white/25"
          disabled={isSwitching}
          onClick={switchToMonad}
        >
          Monad
        </button>
      )}
      <button
        type="button"
        className="rounded-md border border-white/10 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-[#cfe0ff] transition-colors hover:border-white/25"
        onClick={() => open({ view: "Account" })}
      >
        Cuenta
      </button>
      <button
        type="button"
        className="text-xs text-[#6f88b9] transition-colors hover:text-white"
        onClick={() => disconnect()}
        title="Desconectar"
      >
        ✕
      </button>
    </div>
  );
}
