import type { Connector } from "wagmi";

export function pickWalletConnector(connectors: readonly Connector[]) {
  return (
    connectors.find((c) => c.id === "metaMaskSDK" || c.id === "metaMask") ??
    connectors.find((c) => c.id === "injected" || c.type === "injected") ??
    connectors.find((c) => c.name.toLowerCase().includes("metamask")) ??
    connectors[0]
  );
}
