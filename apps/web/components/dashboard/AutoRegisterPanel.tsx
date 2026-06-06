"use client";

import { StatusBanner, type StatusAction, type StatusTone } from "./StatusBanner";
import type { AutoRegisterState } from "../../lib/useAutoRegister";

type Props = {
  state: AutoRegisterState;
  onCancel: () => void;
  onRetry: () => void;
  onClaimOwnership: () => void;
  onSwitchNetwork?: () => void;
  onConnectWallet?: () => void;
};

export function AutoRegisterPanel({
  state,
  onCancel,
  onRetry,
  onClaimOwnership,
  onSwitchNetwork,
  onConnectWallet
}: Props) {
  if (state.status === "idle") return null;

  const { tone, title, description, actions, extra } = buildPresentation(state, {
    onCancel,
    onRetry,
    onClaimOwnership,
    onSwitchNetwork,
    onConnectWallet
  });

  return <StatusBanner tone={tone} title={title} description={description} actions={actions} extra={extra} />;
}

type Presentation = {
  tone: StatusTone;
  title: string;
  description?: React.ReactNode;
  actions?: StatusAction[];
  extra?: React.ReactNode;
};

function buildPresentation(
  state: AutoRegisterState,
  helpers: {
    onCancel: () => void;
    onRetry: () => void;
    onClaimOwnership: () => void;
    onSwitchNetwork?: () => void;
    onConnectWallet?: () => void;
  }
): Presentation {
  switch (state.status) {
    case "server_registered": {
      return {
        tone: "success",
        title: "Evidencia registrada on-chain",
        description: state.message ?? (state.target
          ? `La brecha de "${state.target}" ya está en Monad. No hace falta registrarla otra vez.`
          : "Prueba criptográfica almacenada on-chain."),
        actions: state.explorerUrl
          ? [
              {
                label: "Ver transacción",
                onClick: () => window.open(state.explorerUrl, "_blank", "noopener,noreferrer"),
                variant: "primary" as const
              }
            ]
          : undefined,
        extra: state.txHash ? <TxHash hash={state.txHash} /> : undefined
      };
    }

    case "server_pending":
      return {
        tone: "info",
        title: "Registro on-chain pendiente",
        description: "Usa el botón «Registrar on-chain» en el panel de evidencia para guardar la prueba criptográfica en Monad.",
        actions: [
          { label: "Reintentar", onClick: helpers.onRetry }
        ]
      };

    case "signing":
      return {
        tone: "info",
        title: "Abriendo wallet para firmar…",
        description: state.message ?? "Aprueba la transacción en MetaMask.",
        actions: [{ label: "Cancelar", onClick: helpers.onCancel }],
        extra: <ProgressDots />
      };

    case "confirming": {
      const confirmActions: StatusAction[] = [];
      if (state.explorerUrl) {
        confirmActions.push({
          label: "Ver en explorer",
          onClick: () => window.open(state.explorerUrl, "_blank", "noopener,noreferrer"),
        });
      }
      return {
        tone: "info",
        title: "Confirmando transacción en Monad…",
        description: "Esto suele tardar unos segundos. Si tarda más de 1 min, revisa el explorer.",
        actions: confirmActions.length ? confirmActions : undefined,
        extra: (
          <div className="flex flex-col gap-1.5">
            <ProgressDots />
            {state.txHash && <TxHash hash={state.txHash} />}
          </div>
        )
      };
    }

    case "success": {
      return {
        tone: "success",
        title: state.message ?? "Evidencia registrada en Monad",
        description: state.target
          ? `Target: ${state.target} · Prueba criptográfica asociada a tu wallet.`
          : "Prueba criptográfica almacenada on-chain.",
        actions: state.explorerUrl
          ? [
              {
                label: "Ver transacción",
                onClick: () => window.open(state.explorerUrl, "_blank", "noopener,noreferrer"),
                variant: "primary"
              }
            ]
          : undefined,
        extra: state.txHash ? <TxHash hash={state.txHash} /> : undefined
      };
    }

    case "cancelled":
      return {
        tone: "neutral",
        title: state.message ?? "Registro cancelado",
        description: "Puedes reintentar cuando quieras.",
        actions: [
          { label: "Reintentar", onClick: helpers.onRetry, variant: "primary" }
        ]
      };

    case "blocked": {
      const err = state.error;
      if (!err) return { tone: "neutral", title: "Pendiente de registro on-chain" };

      return {
        tone: "neutral",
        title: err.message,
        description: err.hint
      };
    }

    case "error": {
      const errActions: StatusAction[] = [
        { label: "Reintentar", onClick: helpers.onRetry, variant: "primary" }
      ];
      if (state.explorerUrl) {
        errActions.push({
          label: "Ver en explorer",
          onClick: () => window.open(state.explorerUrl, "_blank", "noopener,noreferrer"),
        });
      }
      return {
        tone: "danger",
        title: state.error?.message ?? state.message ?? "Error al registrar",
        description: state.error?.hint ?? state.message,
        actions: errActions,
        extra: state.txHash ? <TxHash hash={state.txHash} /> : undefined
      };
    }

    default:
      return { tone: "neutral", title: "" };
  }
}

function ProgressDots() {
  return (
    <div className="flex items-center gap-1.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-[#a8c7ff]"
          style={{
            animation: `cw-tick 1.4s ease-in-out ${i * 0.2}s infinite`
          }}
        />
      ))}
    </div>
  );
}

function TxHash({ hash }: { hash: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[11px]">
      <span className="uppercase tracking-[0.22em] text-[#7f9bc9]">tx</span>
      <span className="font-mono text-[#cfe0ff]">
        {hash.slice(0, 10)}…{hash.slice(-8)}
      </span>
    </div>
  );
}
