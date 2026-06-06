import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();

  const verifierAddress = process.env.INDEXER_ADDRESS?.trim() || deployerAddress;

  const breachFactory = await ethers.getContractFactory("BreachRegistry");
  const breach = await breachFactory.deploy(verifierAddress);
  await breach.waitForDeployment();
  const breachAddr = await breach.getAddress();

  const alertFactory = await ethers.getContractFactory("AlertOracle");
  const alert = await alertFactory.deploy(verifierAddress);
  await alert.waitForDeployment();
  const alertAddr = await alert.getAddress();

  const vaultFactory = await ethers.getContractFactory("RemediationVault");
  const vault = await vaultFactory.deploy();
  await vault.waitForDeployment();
  const vaultAddr = await vault.getAddress();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
