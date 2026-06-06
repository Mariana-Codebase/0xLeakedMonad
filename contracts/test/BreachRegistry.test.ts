import { expect } from "chai";
import { ethers } from "hardhat";

const DOMAIN_NAME = "0xLeaked.BreachRegistry";
const DOMAIN_VERSION = "1";

const TYPES = {
  BreachEvidence: [
    { name: "targetHash", type: "bytes32" },
    { name: "source", type: "string" },
    { name: "dataType", type: "string" },
    { name: "beneficiary", type: "address" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" }
  ]
};

describe("BreachRegistry", () => {
  async function setup() {
    const [owner, verifier, alice, attacker] = await ethers.getSigners();
    const factory = await ethers.getContractFactory("BreachRegistry");
    const registry = await factory.deploy(verifier.address);
    await registry.waitForDeployment();
    return { registry, owner, verifier, alice, attacker };
  }

  it("registra una brecha con firma valida del verifier", async () => {
    const { registry, verifier, alice } = await setup();

    const targetHash = ethers.keccak256(ethers.toUtf8Bytes("alice@example.com"));
    const source = "hibp";
    const dataType = "email";
    const beneficiary = alice.address;
    const nonce = 0n;
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);

    const domain = {
      name: DOMAIN_NAME,
      version: DOMAIN_VERSION,
      chainId: (await ethers.provider.getNetwork()).chainId,
      verifyingContract: await registry.getAddress()
    };

    const signature = await verifier.signTypedData(domain, TYPES, {
      targetHash,
      source,
      dataType,
      beneficiary,
      nonce,
      deadline
    });

    await expect(
      registry.recordBreachWithProof(
        targetHash,
        source,
        dataType,
        beneficiary,
        nonce,
        deadline,
        signature
      )
    )
      .to.emit(registry, "BreachRecorded")
      .withArgs(0, targetHash, beneficiary, source, dataType, (await ethers.getSigners())[0].address, 0);

    expect(await registry.totalBreaches()).to.equal(1);
    expect(await registry.nonces(verifier.address)).to.equal(1);
    expect(await registry.isRegistered(targetHash, source)).to.be.true;
  });

  it("rechaza firma de signer no autorizado", async () => {
    const { registry, attacker, alice } = await setup();

    const targetHash = ethers.keccak256(ethers.toUtf8Bytes("alice@example.com"));
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);

    const domain = {
      name: DOMAIN_NAME,
      version: DOMAIN_VERSION,
      chainId: (await ethers.provider.getNetwork()).chainId,
      verifyingContract: await registry.getAddress()
    };

    const signature = await attacker.signTypedData(domain, TYPES, {
      targetHash,
      source: "hibp",
      dataType: "email",
      beneficiary: alice.address,
      nonce: 0n,
      deadline
    });

    await expect(
      registry.recordBreachWithProof(
        targetHash,
        "hibp",
        "email",
        alice.address,
        0n,
        deadline,
        signature
      )
    ).to.be.revertedWithCustomError(registry, "NotAVerifier");
  });

  it("rechaza firma duplicada (mismo target, misma source)", async () => {
    const { registry, verifier, alice } = await setup();

    const targetHash = ethers.keccak256(ethers.toUtf8Bytes("alice@example.com"));
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);
    const domain = {
      name: DOMAIN_NAME,
      version: DOMAIN_VERSION,
      chainId: (await ethers.provider.getNetwork()).chainId,
      verifyingContract: await registry.getAddress()
    };

    const sig1 = await verifier.signTypedData(domain, TYPES, {
      targetHash, source: "hibp", dataType: "email",
      beneficiary: alice.address, nonce: 0n, deadline
    });

    await registry.recordBreachWithProof(targetHash, "hibp", "email", alice.address, 0n, deadline, sig1);

    const sig2 = await verifier.signTypedData(domain, TYPES, {
      targetHash, source: "hibp", dataType: "email",
      beneficiary: alice.address, nonce: 1n, deadline
    });

    await expect(
      registry.recordBreachWithProof(targetHash, "hibp", "email", alice.address, 1n, deadline, sig2)
    ).to.be.revertedWithCustomError(registry, "DuplicateBreach");
  });

  it("rechaza firma expirada", async () => {
    const { registry, verifier, alice } = await setup();

    const targetHash = ethers.keccak256(ethers.toUtf8Bytes("alice@example.com"));
    const deadline = BigInt(Math.floor(Date.now() / 1000) - 1); // ya vencida
    const domain = {
      name: DOMAIN_NAME,
      version: DOMAIN_VERSION,
      chainId: (await ethers.provider.getNetwork()).chainId,
      verifyingContract: await registry.getAddress()
    };

    const sig = await verifier.signTypedData(domain, TYPES, {
      targetHash, source: "hibp", dataType: "email",
      beneficiary: alice.address, nonce: 0n, deadline
    });

    await expect(
      registry.recordBreachWithProof(targetHash, "hibp", "email", alice.address, 0n, deadline, sig)
    ).to.be.revertedWithCustomError(registry, "SignatureExpired");
  });

  it("rechaza nonce incorrecto (replay protection)", async () => {
    const { registry, verifier, alice } = await setup();

    const targetHash = ethers.keccak256(ethers.toUtf8Bytes("alice@example.com"));
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);
    const domain = {
      name: DOMAIN_NAME,
      version: DOMAIN_VERSION,
      chainId: (await ethers.provider.getNetwork()).chainId,
      verifyingContract: await registry.getAddress()
    };

    const sig = await verifier.signTypedData(domain, TYPES, {
      targetHash, source: "hibp", dataType: "email",
      beneficiary: alice.address, nonce: 5n, deadline
    });

    await expect(
      registry.recordBreachWithProof(targetHash, "hibp", "email", alice.address, 5n, deadline, sig)
    ).to.be.revertedWithCustomError(registry, "InvalidNonce");
  });

  it("permite distintas sources para el mismo target", async () => {
    const { registry, verifier, alice } = await setup();

    const targetHash = ethers.keccak256(ethers.toUtf8Bytes("alice@example.com"));
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);
    const domain = {
      name: DOMAIN_NAME,
      version: DOMAIN_VERSION,
      chainId: (await ethers.provider.getNetwork()).chainId,
      verifyingContract: await registry.getAddress()
    };

    const sig1 = await verifier.signTypedData(domain, TYPES, {
      targetHash, source: "hibp", dataType: "email",
      beneficiary: alice.address, nonce: 0n, deadline
    });
    await registry.recordBreachWithProof(targetHash, "hibp", "email", alice.address, 0n, deadline, sig1);

    const sig2 = await verifier.signTypedData(domain, TYPES, {
      targetHash, source: "manual", dataType: "email",
      beneficiary: alice.address, nonce: 1n, deadline
    });
    await registry.recordBreachWithProof(targetHash, "manual", "email", alice.address, 1n, deadline, sig2);

    expect(await registry.totalBreaches()).to.equal(2);
  });
});
