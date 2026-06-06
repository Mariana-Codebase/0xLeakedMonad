export const remediationVaultAbi = [
  { type: "constructor", inputs: [], stateMutability: "nonpayable" },
  { type: "receive", stateMutability: "payable" },
  {
    type: "function",
    name: "depositNative",
    stateMutability: "payable",
    inputs: [],
    outputs: []
  },
  {
    type: "function",
    name: "withdrawNative",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "depositERC20",
    stateMutability: "nonpayable",
    inputs: [
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "withdrawERC20",
    stateMutability: "nonpayable",
    inputs: [
      { name: "token", type: "address" },
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "nativeBalanceOf",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ type: "uint256" }]
  },
  {
    type: "function",
    name: "tokenBalanceOf",
    stateMutability: "view",
    inputs: [
      { name: "", type: "address" },
      { name: "", type: "address" }
    ],
    outputs: [{ type: "uint256" }]
  },
  {
    type: "function",
    name: "setPaused",
    stateMutability: "nonpayable",
    inputs: [{ name: "_paused", type: "bool" }],
    outputs: []
  },
  {
    type: "function",
    name: "paused",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "bool" }]
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
    name: "NativeDeposited",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "NativeWithdrawn",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "TokenDeposited",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "token", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "TokenWithdrawn",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "token", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "PauseToggled",
    inputs: [{ name: "paused", type: "bool", indexed: false }],
    anonymous: false
  }
] as const;
