import { config as dotenvConfig } from "dotenv";
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

dotenvConfig({ path: "../.env" });

const monadRpcUrl = process.env.MONAD_RPC_URL ?? "https://rpc.ankr.com/monad_testnet";
const deployerPrivateKey = process.env.DEPLOYER_PRIVATE_KEY ?? "";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      viaIR: true,
      optimizer: { enabled: true, runs: 200 }
    }
  },
  networks: {
    monadTestnet: {
      url: monadRpcUrl,
      chainId: Number(process.env.MONAD_CHAIN_ID ?? 10143),
      accounts: deployerPrivateKey ? [deployerPrivateKey] : []
    }
  }
};

export default config;
