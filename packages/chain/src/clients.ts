/**
 * Clients viem para hablar con Monad.
 *
 * - publicClient: lecturas (eth_call, eth_getCode, logs, etc).
 * - serverWalletClient: escrituras firmadas por la wallet del indexer/verifier.
 *
 * La private key del server se lee de INDEXER_PRIVATE_KEY.
 * Si no está configurada, getServerWallet() devuelve null y los servicios
 * que dependen de ella deben fallar con un error claro.
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  type Account,
  type Address,
  type Hex,
  type PublicClient,
  type WalletClient
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { getMonadTestnet } from "./monad.js";

let cachedPublic: PublicClient | null = null;
let cachedWallet: { client: WalletClient; account: Account } | null = null;

function resolveHttpRpcUrl(): string {
  const raw = process.env.MONAD_RPC_URL ?? "https://monad-testnet.g.alchemy.com/v2/YOUR_KEY";
  return raw.startsWith("wss://") ? raw.replace("wss://", "https://") : raw;
}

function createRetryTransport() {
  return http(resolveHttpRpcUrl(), {
    retryCount: 5,
    retryDelay: 1500,
    timeout: 60_000
  });
}

export function getPublicClient(): PublicClient {
  if (cachedPublic) return cachedPublic;
  cachedPublic = createPublicClient({
    chain: getMonadTestnet(),
    transport: createRetryTransport()
  });
  return cachedPublic;
}

/**
 * Devuelve la wallet del server o null si no está configurada.
 * Cachea entre llamadas.
 */
export function getServerWallet(): { client: WalletClient; account: Account } | null {
  if (cachedWallet) return cachedWallet;

  const raw = process.env.INDEXER_PRIVATE_KEY?.trim();
  if (!raw) return null;

  const pk = (raw.startsWith("0x") ? raw : `0x${raw}`) as Hex;
  const account = privateKeyToAccount(pk);
  const client = createWalletClient({
    account,
    chain: getMonadTestnet(),
    transport: createRetryTransport()
  });

  cachedWallet = { client, account };
  return cachedWallet;
}

/**
 * Helper estricto: lanza si la wallet no está configurada.
 * Usalo en endpoints que requieren firmar — devuelve un error 503 claro.
 */
export function requireServerWallet(): { client: WalletClient; account: Account } {
  const w = getServerWallet();
  if (!w) {
    throw new Error(
      "INDEXER_PRIVATE_KEY no configurada en .env. El servidor no puede firmar transacciones."
    );
  }
  return w;
}

export function getServerAddress(): Address | null {
  return getServerWallet()?.account.address ?? null;
}
