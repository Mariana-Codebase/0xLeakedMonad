type AppEnv = {
  appName: string;
  appUrl: string;
  environment: string;
  chainId: string;
  chainHexId: string;
  monadRpcUrl: string;
  monadExplorerUrl: string;
  monadChainName: string;
  enabledModules: string[];
};

function parseModules(raw: string | undefined): string[] {
  if (!raw) {
    return ["breach-scanner", "contract-auditor", "remediation-hub"];
  }

  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export const appEnv: AppEnv = {
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? "0xLeaked",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  environment: process.env.NEXT_PUBLIC_ENV ?? "development",
  chainId: process.env.NEXT_PUBLIC_CHAIN_ID ?? "10143",
  chainHexId: process.env.NEXT_PUBLIC_CHAIN_HEX_ID ?? "0x279f",
  monadRpcUrl: process.env.NEXT_PUBLIC_MONAD_RPC_URL ?? "https://rpc.ankr.com/monad_testnet",
  monadExplorerUrl:
    process.env.NEXT_PUBLIC_MONAD_EXPLORER_URL ?? "https://testnet.monadexplorer.com",
  monadChainName: process.env.NEXT_PUBLIC_MONAD_CHAIN_NAME ?? "Monad Testnet",
  enabledModules: parseModules(process.env.NEXT_PUBLIC_ENABLED_MODULES)
};
