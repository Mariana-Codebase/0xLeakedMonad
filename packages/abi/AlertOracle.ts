export const alertOracleAbi = [
  {
    type: "constructor",
    inputs: [{ name: "initialVerifier", type: "address" }],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "updateScoreWithProof",
    stateMutability: "nonpayable",
    inputs: [
      { name: "contractAddress", type: "address" },
      { name: "score", type: "uint8" },
      { name: "label", type: "string" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" },
      { name: "signature", type: "bytes" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "setVerifier",
    stateMutability: "nonpayable",
    inputs: [
      { name: "verifier", type: "address" },
      { name: "enabled", type: "bool" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "isVerifier",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ type: "bool" }]
  },
  {
    type: "function",
    name: "nonces",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ type: "uint256" }]
  },
  {
    type: "function",
    name: "scores",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [
      { name: "score", type: "uint8" },
      { name: "label", type: "string" },
      { name: "updatedAt", type: "uint256" },
      { name: "updatedBy", type: "address" }
    ]
  },
  {
    type: "function",
    name: "domainSeparator",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "bytes32" }]
  },
  {
    type: "function",
    name: "owner",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }]
  },
  {
    type: "event",
    name: "ScoreUpdated",
    inputs: [
      { name: "contractAddress", type: "address", indexed: true },
      { name: "score", type: "uint8", indexed: false },
      { name: "label", type: "string", indexed: false },
      { name: "updatedAt", type: "uint256", indexed: false },
      { name: "updatedBy", type: "address", indexed: true },
      { name: "nonce", type: "uint256", indexed: false }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "VerifierSet",
    inputs: [
      { name: "verifier", type: "address", indexed: true },
      { name: "enabled", type: "bool", indexed: false }
    ],
    anonymous: false
  }
] as const;
