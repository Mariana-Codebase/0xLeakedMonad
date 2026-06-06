export const breachRegistryAbi = [
  {
    type: "constructor",
    inputs: [{ name: "initialVerifier", type: "address" }],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "recordBreachWithProof",
    stateMutability: "nonpayable",
    inputs: [
      { name: "targetHash", type: "bytes32" },
      { name: "source", type: "string" },
      { name: "dataType", type: "string" },
      { name: "beneficiary", type: "address" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" },
      { name: "signature", type: "bytes" }
    ],
    outputs: [{ name: "recordId", type: "uint256" }]
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
    name: "totalBreaches",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }]
  },
  {
    type: "function",
    name: "isRegistered",
    stateMutability: "view",
    inputs: [
      { name: "targetHash", type: "bytes32" },
      { name: "source", type: "string" }
    ],
    outputs: [{ type: "bool" }]
  },
  {
    type: "function",
    name: "recordsOfBeneficiary",
    stateMutability: "view",
    inputs: [{ name: "beneficiary", type: "address" }],
    outputs: [{ type: "uint256[]" }]
  },
  {
    type: "function",
    name: "records",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [
      { name: "targetHash", type: "bytes32" },
      { name: "source", type: "string" },
      { name: "dataType", type: "string" },
      { name: "beneficiary", type: "address" },
      { name: "reporter", type: "address" },
      { name: "timestamp", type: "uint256" }
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
    name: "BreachRecorded",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "targetHash", type: "bytes32", indexed: true },
      { name: "beneficiary", type: "address", indexed: true },
      { name: "source", type: "string", indexed: false },
      { name: "dataType", type: "string", indexed: false },
      { name: "reporter", type: "address", indexed: false },
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
