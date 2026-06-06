"use client";

import { useAppKit } from "@reown/appkit/react";
import { useLeaked } from "../lib/useChainWatch";

function shortAddress(address: string | undefined): string {
  if (!address) return "No conectado";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function WalletPanel() {
  const {
    address,
    isConnected,
    isMonadNetwork,
    networkLabel,
    metaMaskConnector,
    isConnecting,
    isSwitching,
    connect,
    disconnect,
    switchToMonad
  } = useLeaked();
  const { open } = useAppKit();

  return (
    <article className="cw-card h-full">
      <div className="flex items-center justify-between gap-3">
        <h3 className="cw-display text-lg text-white">Wallet</h3>
        {isConnected && (
          <span
            className={`cw-badge border ${
              isMonadNetwork
                ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
                : "border-rose-400/30 bg-rose-500/10 text-rose-300"
            }`}
          >
            {networkLabel}
          </span>
        )}
      </div>

      <p className="mt-1 text-sm text-[#94a3b8]">
        {isConnected
          ? "Sesión activa."
          : "Conecta con MetaMask o WalletConnect para registrar evidencia en Monad."}
      </p>

      {!isConnected ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className="cw-btn"
            disabled={isConnecting || !metaMaskConnector}
            onClick={() => metaMaskConnector && connect({ connector: metaMaskConnector })}
          >
            MetaMask
          </button>
          <button type="button" className="cw-btn-ghost" onClick={() => open()}>
            WalletConnect
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
            <div className="cw-section-label">Cuenta</div>
            <div className="mt-1 font-mono text-sm text-white">{shortAddress(address)}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            {!isMonadNetwork && (
              <button
                type="button"
                className="cw-btn-ghost"
                disabled={isSwitching}
                onClick={switchToMonad}
              >
                Cambiar a Monad
              </button>
            )}
            <button type="button" className="cw-btn-ghost" onClick={() => open({ view: "Account" })}>
              Cuenta
            </button>
            <button
              type="button"
              className="rounded-lg border border-white/10 px-3 py-2 text-sm text-[#6f88b9] transition-colors hover:border-white/25 hover:text-white"
              onClick={() => disconnect()}
            >
              Desconectar
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
