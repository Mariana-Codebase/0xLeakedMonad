import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();

  console.log("Deploying with:", deployerAddress);

  const verifierAddress = process.env.INDEXER_ADDRESS?.trim() || deployerAddress;
  console.log("Initial verifier:", verifierAddress);

  const breachFactory = await ethers.getContractFactory("BreachRegistry");
  const breach = await breachFactory.deploy(verifierAddress);
  await breach.waitForDeployment();
  const breachAddr = await breach.getAddress();
  console.log("BreachRegistry:", breachAddr);

  const alertFactory = await ethers.getContractFactory("AlertOracle");
  const alert = await alertFactory.deploy(verifierAddress);
  await alert.waitForDeployment();
  const alertAddr = await alert.getAddress();
  console.log("AlertOracle:", alertAddr);

  const vaultFactory = await ethers.getContractFactory("RemediationVault");
  const vault = await vaultFactory.deploy();
  await vault.waitForDeployment();
  const vaultAddr = await vault.getAddress();
  console.log("RemediationVault:", vaultAddr);

  console.log("\n--- Actualiza .env con estos valores ---");
  console.log(`BREACH_REGISTRY_ADDRESS=${breachAddr}`);
  console.log(`ALERT_ORACLE_ADDRESS=${alertAddr}`);
  console.log(`REMEDIATION_VAULT_ADDRESS=${vaultAddr}`);
  console.log(`NEXT_PUBLIC_BREACH_REGISTRY_ADDRESS=${breachAddr}`);
  console.log(`NEXT_PUBLIC_ALERT_ORACLE_ADDRESS=${alertAddr}`);
  console.log(`NEXT_PUBLIC_REMEDIATION_VAULT_ADDRESS=${vaultAddr}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
