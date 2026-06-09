import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as dotenv } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv({ path: path.resolve(__dirname, "../../../.env") });

function required(value: string | undefined, fallback: string): string {
  return value?.trim() || fallback;
}

export const config = {
  // Render inyecta PORT; en local se usa API_GATEWAY_PORT
  port: Number(process.env.PORT ?? process.env.API_GATEWAY_PORT ?? 4000),
  breachServiceUrl: required(process.env.BREACH_SERVICE_URL, "http://localhost:4101"),
  analyzerServiceUrl: required(process.env.ANALYZER_SERVICE_URL, "http://localhost:4102"),
  alertServiceUrl: required(process.env.ALERT_SERVICE_URL, "http://localhost:4103"),

  alchemyWebhookSigningKey: required(
    process.env.ALCHEMY_WEBHOOK_SIGNING_KEY || process.env.ALCHEMY_WEBHOOK_AUTH_TOKEN,
    ""
  ),

  // Lista separada por comas; vacío = permitir cualquier origen (dev)
  corsOrigin: required(process.env.CORS_ORIGIN, ""),

  appEnv: required(process.env.NEXT_PUBLIC_ENV, "development"),

  // RPC para eth_getLogs (el público de Monad permite rangos de 100 bloques;
  // Alchemy free tier solo 10)
  logsRpcUrl: required(process.env.LOGS_RPC_URL, "https://testnet-rpc.monad.xyz"),

  monadChainId: required(process.env.MONAD_CHAIN_ID, "10143"),

  breachRegistryAddress: required(process.env.BREACH_REGISTRY_ADDRESS, ""),
  alertOracleAddress: required(process.env.ALERT_ORACLE_ADDRESS, ""),
  remediationVaultAddress: required(process.env.REMEDIATION_VAULT_ADDRESS, "")
};
