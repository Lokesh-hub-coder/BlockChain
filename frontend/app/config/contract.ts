export const CONTRACT_ADDRESS = '0x4fd78ce671227afc10a7a14ac310f5b05f7760e8' as `0x${string}`;

// PraiseBoard Contract ABI
export const CONTRACT_ABI = [
  {
    type: 'function',
    name: 'tip',
    inputs: [
      {
        name: 'note',
        type: 'string',
      },
    ],
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'withdraw',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getBalance',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'owner',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'Tip',
    inputs: [
      {
        name: 'supporter',
        type: 'address',
        indexed: true,
      },
      {
        name: 'amount',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'note',
        type: 'string',
        indexed: false,
      },
    ],
  },
] as const;
