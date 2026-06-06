/**
 * IPFS client — pin JSON blobs and retrieve them via public gateways.
 *
 * Supports two backends:
 *   1. Pinata (default, requires PINATA_JWT in env)
 *   2. Local/custom IPFS HTTP API (/api/v0/add)
 *
 * Reading always goes through a public gateway (configurable).
 */

export type IpfsConfig = {
  pinataJwt?: string;
  ipfsApiUrl?: string;
  gatewayUrl?: string;
};

const DEFAULT_GATEWAY = "https://gateway.pinata.cloud/ipfs";

function getConfig(): IpfsConfig {
  return {
    pinataJwt: process.env.PINATA_JWT ?? process.env.NEXT_PUBLIC_PINATA_JWT,
    ipfsApiUrl: process.env.IPFS_API_URL,
    gatewayUrl:
      process.env.IPFS_GATEWAY_URL ??
      process.env.NEXT_PUBLIC_IPFS_GATEWAY_URL ??
      DEFAULT_GATEWAY
  };
}

export function buildIpfsUrl(cid: string, config?: IpfsConfig): string {
  const gateway = config?.gatewayUrl ?? getConfig().gatewayUrl ?? DEFAULT_GATEWAY;
  return `${gateway}/${cid}`;
}

/**
 * Pin a JSON object to IPFS and return the CID.
 * Uses Pinata if PINATA_JWT is set, otherwise falls back to a local IPFS node.
 */
export async function pinJson(
  data: unknown,
  metadata?: { name?: string }
): Promise<string> {
  const cfg = getConfig();

  if (cfg.pinataJwt) {
    return pinViaPinata(data, cfg.pinataJwt, metadata);
  }

  if (cfg.ipfsApiUrl) {
    return pinViaIpfsApi(data, cfg.ipfsApiUrl);
  }

  throw new Error(
    "IPFS not configured: set PINATA_JWT or IPFS_API_URL in environment."
  );
}

/**
 * Fetch JSON content from IPFS by CID.
 */
export async function fetchFromIpfs<T = unknown>(cid: string): Promise<T> {
  const url = buildIpfsUrl(cid);
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15_000)
  });

  if (!res.ok) {
    throw new Error(`IPFS fetch failed: ${res.status} ${res.statusText} (cid=${cid})`);
  }

  return res.json() as Promise<T>;
}

async function pinViaPinata(
  data: unknown,
  jwt: string,
  metadata?: { name?: string }
): Promise<string> {
  const body = {
    pinataContent: data,
    pinataMetadata: {
      name: metadata?.name ?? `0xleaked-${Date.now()}`
    }
  };

  const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000)
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Pinata pin failed: ${res.status} — ${err.slice(0, 200)}`);
  }

  const result = (await res.json()) as { IpfsHash: string };
  return result.IpfsHash;
}

async function pinViaIpfsApi(data: unknown, apiUrl: string): Promise<string> {
  const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
  const form = new FormData();
  form.append("file", blob, "data.json");

  const res = await fetch(`${apiUrl}/api/v0/add?pin=true`, {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(30_000)
  });

  if (!res.ok) {
    throw new Error(`IPFS API pin failed: ${res.status}`);
  }

  const result = (await res.json()) as { Hash: string };
  return result.Hash;
}
