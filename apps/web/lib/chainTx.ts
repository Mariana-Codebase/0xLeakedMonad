import type { Address, Chain, Hex, PublicClient, WalletClient } from "viem";

const DEFAULT_GAS = 1_500_000n;
const GAS_BUFFER_NUM = 160n;
const GAS_BUFFER_DEN = 100n;

export function withGasBuffer(estimate: bigint): bigint {
  const buffered = (estimate * GAS_BUFFER_NUM) / GAS_BUFFER_DEN;
  return buffered > DEFAULT_GAS ? buffered : DEFAULT_GAS;
}

export function parseChainError(raw: string): { title: string; hint: string } {
  const msg = raw.toLowerCase();

  if (/duplicatebreach|duplicate breach|ya está registrad/i.test(msg)) {
    return {
      title: "Evidencia ya registrada",
      hint: "Esta brecha ya existe on-chain para la misma fuente. No hace falta volver a registrarla."
    };
  }
  if (/invalidnonce|invalid nonce/i.test(msg)) {
    return {
      title: "Firma expirada o ya usada",
      hint: "Solicita una nueva firma al servidor e intenta de nuevo enseguida."
    };
  }
  if (/signatureexpired|expired/i.test(msg)) {
    return {
      title: "Firma expirada",
      hint: "La firma EIP-712 venció. Pulsa Registrar de nuevo para obtener una firma nueva."
    };
  }
  if (/out of gas|intrinsic gas too low/i.test(msg)) {
    return {
      title: "Gas insuficiente",
      hint: "La transacción necesita más gas en Monad. Vuelve a intentar; el límite se estimará automáticamente."
    };
  }
  if (/rpc request failed|gettransactioncount|rate limit|429|compute units/i.test(msg)) {
    return {
      title: "Error de conexión con Monad",
      hint: "Alchemy no respondió. Espera 10–20 s y pulsa Reintentar."
    };
  }
  if (/timeout|timed out/i.test(msg)) {
    return {
      title: "Tiempo de espera agotado",
      hint: "La red tardó en responder. Revisa el explorer por si la transacción se confirmó igualmente."
    };
  }
  if (/insufficient|funds|balance/i.test(msg)) {
    return {
      title: "Fondos insuficientes",
      hint: "Necesitas MON en Monad Testnet para pagar el gas de la transacción."
    };
  }
  if (/revert|rejected/i.test(msg)) {
    return {
      title: "Transacción revertida",
      hint: "El contrato rechazó la operación. Suele ocurrir si la evidencia ya está registrada o la firma no es válida."
    };
  }

  return {
    title: "Error en la transacción",
    hint: raw.length > 200 ? `${raw.slice(0, 200)}…` : raw
  };
}

type WriteBreachArgs = {
  publicClient: PublicClient;
  walletClient: WalletClient;
  contractAddress: Address;
  abi: readonly unknown[];
  account: Address;
  args: readonly unknown[];
  chain?: Chain;
};

export async function writeBreachWithEstimatedGas(
  params: WriteBreachArgs
): Promise<Hex> {
  const { publicClient, walletClient, contractAddress, abi, account, args, chain } = params;

  const call = {
    address: contractAddress,
    abi,
    functionName: "recordBreachWithProof" as const,
    args,
    account
  };

  let gas = DEFAULT_GAS;
  try {
    await publicClient.simulateContract(call);
    const gasEstimate = await publicClient.estimateContractGas(call);
    gas = withGasBuffer(gasEstimate);
  } catch (simErr) {
    const simMsg = (simErr as Error).message ?? "";
    if (/DuplicateBreach|duplicate/i.test(simMsg)) throw simErr;
    if (/NotAVerifier/i.test(simMsg)) throw simErr;
    if (/InvalidNonce/i.test(simMsg)) throw simErr;
    if (/SignatureExpired/i.test(simMsg)) throw simErr;
    console.warn("[chainTx] simulateContract falló, enviando con gas por defecto:", simMsg.slice(0, 120));
  }

  return walletClient.writeContract({
    ...call,
    gas,
    chain: chain ?? null
  });
}
