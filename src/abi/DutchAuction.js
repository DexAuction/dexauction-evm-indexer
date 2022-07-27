module.exports = [
  {
    inputs: [
      {
        internalType: "address",
        name: "_proxyContract",
        type: "address"
      }
    ],
    stateMutability: "nonpayable",
    type: "constructor"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "auctionId",
        type: "uint256"
      }
    ],
    name: "AuctionCancel",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "auctionId",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "startTime",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "reservePrice",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "dropAmount",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "openingPrice",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "roundDuration",
        type: "uint256"
      },
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address"
      }
    ],
    name: "AuctionConfigure",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "auctionId",
        type: "uint256"
      },
      {
        indexed: true,
        internalType: "address",
        name: "auctionOwner",
        type: "address"
      },
      {
        indexed: true,
        internalType: "uint256",
        name: "startTime",
        type: "uint256"
      }
    ],
    name: "AuctionCreate",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "auctionId",
        type: "uint256"
      },
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "winningBid",
        type: "uint256"
      }
    ],
    name: "AuctionEnd",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "auctionId",
        type: "uint256"
      },
      {
        indexed: true,
        internalType: "uint256",
        name: "winningBid",
        type: "uint256"
      },
      {
        indexed: true,
        internalType: "address",
        name: "winner",
        type: "address"
      }
    ],
    name: "PriceAccept",
    type: "event"
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "auctionId",
        type: "uint256"
      }
    ],
    name: "acceptPrice",
    outputs: [],
    stateMutability: "payable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    name: "auctions",
    outputs: [
      {
        internalType: "address payable",
        name: "owner",
        type: "address"
      },
      {
        internalType: "address payable",
        name: "winner",
        type: "address"
      },
      {
        internalType: "uint256",
        name: "startTime",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "reservePrice",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "openingPrice",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "winningBid",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "dropAmount",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "state",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "roundDuration",
        type: "uint256"
      },
      {
        internalType: "bool",
        name: "isExists",
        type: "bool"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "auctionId",
        type: "uint256"
      }
    ],
    name: "cancelAuction",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "auctionId",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "startTime",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "reservePrice",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "dropAmount",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "openingPrice",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "roundDuration",
        type: "uint256"
      }
    ],
    name: "configureAuction",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "auctionId",
        type: "uint256"
      },
      {
        internalType: "address payable",
        name: "auctionOwner",
        type: "address"
      }
    ],
    name: "createAuction",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "proxyContract",
    outputs: [
      {
        internalType: "contract DexAuction",
        name: "",
        type: "address"
      }
    ],
    stateMutability: "view",
    type: "function"
  }
];
