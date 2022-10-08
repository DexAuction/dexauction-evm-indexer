module.exports = [
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "admin",
				"type": "address"
			}
		],
		"stateMutability": "nonpayable",
		"type": "constructor"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "auctionId",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "string",
				"name": "auction_type",
				"type": "string"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "auctionOwner",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "tokenContractAddress",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "tokenId",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "quantity",
				"type": "uint256"
			}
		],
		"name": "AuctionCreateProxy",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "auctionId",
				"type": "uint256"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "owner",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "winningBid",
				"type": "uint256"
			}
		],
		"name": "AuctionEnd",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "auctionId",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "string",
				"name": "auction_type",
				"type": "string"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "auctionOwner",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "basketId",
				"type": "uint256"
			}
		],
		"name": "BasketAuctionCreateProxy",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "basketId",
				"type": "uint256"
			},
			{
				"components": [
					{
						"internalType": "address",
						"name": "NFT_contract_address",
						"type": "address"
					},
					{
						"internalType": "uint256[]",
						"name": "asset_token_ids",
						"type": "uint256[]"
					},
					{
						"internalType": "uint256[]",
						"name": "quantities",
						"type": "uint256[]"
					},
					{
						"internalType": "enum DexAuction.TokenStandards",
						"name": "tokenStandard",
						"type": "uint8"
					}
				],
				"indexed": false,
				"internalType": "struct DexAuction.SubBasket[]",
				"name": "subBaskets",
				"type": "tuple[]"
			}
		],
		"name": "BasketCreate",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "basketId",
				"type": "uint256"
			}
		],
		"name": "BasketDestroy",
		"type": "event"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "auctions",
		"outputs": [
			{
				"internalType": "string",
				"name": "auction_type",
				"type": "string"
			},
			{
				"internalType": "address",
				"name": "owner",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "NFT_contract_address",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "contract_address",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "asset_token_id",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "asset_quantity",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "basketId",
				"type": "uint256"
			},
			{
				"internalType": "bool",
				"name": "isExists",
				"type": "bool"
			},
			{
				"internalType": "bool",
				"name": "isBasketAuction",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function",
		"constant": true
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "basketAuctions",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function",
		"constant": true
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"name": "contractTokenStandards",
		"outputs": [
			{
				"internalType": "enum DexAuction.TokenStandards",
				"name": "",
				"type": "uint8"
			}
		],
		"stateMutability": "view",
		"type": "function",
		"constant": true
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			},
			{
				"internalType": "uint256[]",
				"name": "",
				"type": "uint256[]"
			},
			{
				"internalType": "uint256[]",
				"name": "",
				"type": "uint256[]"
			},
			{
				"internalType": "bytes",
				"name": "",
				"type": "bytes"
			}
		],
		"name": "onERC1155BatchReceived",
		"outputs": [
			{
				"internalType": "bytes4",
				"name": "",
				"type": "bytes4"
			}
		],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			},
			{
				"internalType": "bytes",
				"name": "",
				"type": "bytes"
			}
		],
		"name": "onERC1155Received",
		"outputs": [
			{
				"internalType": "bytes4",
				"name": "",
				"type": "bytes4"
			}
		],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "bytes4",
				"name": "interfaceId",
				"type": "bytes4"
			}
		],
		"name": "supportsInterface",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function",
		"constant": true
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			},
			{
				"internalType": "bytes",
				"name": "",
				"type": "bytes"
			}
		],
		"name": "onERC721Received",
		"outputs": [
			{
				"internalType": "bytes4",
				"name": "",
				"type": "bytes4"
			}
		],
		"stateMutability": "pure",
		"type": "function",
		"constant": true
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "_english_auction_house",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "_dutch_auction_house",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "_sealed_bid_auction_house",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "_vickrey_auction_house",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "_fpl_auction_house",
				"type": "address"
			}
		],
		"name": "saveFactoryAddresses",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"components": [
					{
						"internalType": "address",
						"name": "NFT_contract_address",
						"type": "address"
					},
					{
						"internalType": "uint256[]",
						"name": "asset_token_ids",
						"type": "uint256[]"
					},
					{
						"internalType": "uint256[]",
						"name": "quantities",
						"type": "uint256[]"
					},
					{
						"internalType": "enum DexAuction.TokenStandards",
						"name": "tokenStandard",
						"type": "uint8"
					}
				],
				"internalType": "struct DexAuction.SubBasket[]",
				"name": "_subBaskets",
				"type": "tuple[]"
			}
		],
		"name": "createBasket",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_basketId",
				"type": "uint256"
			}
		],
		"name": "destroyBasket",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_basketId",
				"type": "uint256"
			}
		],
		"name": "getBasket",
		"outputs": [
			{
				"internalType": "uint256[]",
				"name": "_subBasketIds",
				"type": "uint256[]"
			},
			{
				"internalType": "bool",
				"name": "isExists",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function",
		"constant": true
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_subBasketId",
				"type": "uint256"
			}
		],
		"name": "getSubBasket",
		"outputs": [
			{
				"internalType": "address",
				"name": "NFT_contract_address",
				"type": "address"
			},
			{
				"internalType": "uint256[]",
				"name": "asset_token_ids",
				"type": "uint256[]"
			},
			{
				"internalType": "uint256[]",
				"name": "quantities",
				"type": "uint256[]"
			},
			{
				"internalType": "enum DexAuction.TokenStandards",
				"name": "tokenStandard",
				"type": "uint8"
			}
		],
		"stateMutability": "view",
		"type": "function",
		"constant": true
	},
	{
		"inputs": [
			{
				"internalType": "string",
				"name": "_auction_type",
				"type": "string"
			},
			{
				"internalType": "address",
				"name": "_NFT_contract_address",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "_asset_token_id",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "_asset_quantity",
				"type": "uint256"
			}
		],
		"name": "createNFTAuction",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "string",
				"name": "_auction_type",
				"type": "string"
			},
			{
				"internalType": "uint256",
				"name": "_basketId",
				"type": "uint256"
			}
		],
		"name": "createBasketAuction",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_auctionId",
				"type": "uint256"
			},
			{
				"internalType": "address",
				"name": "_owner",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "winnningBid",
				"type": "uint256"
			}
		],
		"name": "endAuction",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "_english_auction_house",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "_dutch_auction_house",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "_sealed_bid_auction_house",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "_vickrey_auction_house",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "_fpl_auction_house",
				"type": "address"
			}
		],
		"name": "saveFactoryAddresses",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"components": [
					{
						"internalType": "address",
						"name": "NFT_contract_address",
						"type": "address"
					},
					{
						"internalType": "uint256[]",
						"name": "asset_token_ids",
						"type": "uint256[]"
					},
					{
						"internalType": "uint256[]",
						"name": "quantities",
						"type": "uint256[]"
					},
					{
						"internalType": "enum DexAuction.TokenStandards",
						"name": "tokenStandard",
						"type": "uint8"
					}
				],
				"internalType": "struct DexAuction.SubBasket[]",
				"name": "_subBaskets",
				"type": "tuple[]"
			}
		],
		"name": "createBasket",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_basketId",
				"type": "uint256"
			}
		],
		"name": "destroyBasket",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_basketId",
				"type": "uint256"
			}
		],
		"name": "getBasket",
		"outputs": [
			{
				"internalType": "uint256[]",
				"name": "_subBasketIds",
				"type": "uint256[]"
			},
			{
				"internalType": "bool",
				"name": "isExists",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function",
		"constant": true
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_subBasketId",
				"type": "uint256"
			}
		],
		"name": "getSubBasket",
		"outputs": [
			{
				"internalType": "address",
				"name": "NFT_contract_address",
				"type": "address"
			},
			{
				"internalType": "uint256[]",
				"name": "asset_token_ids",
				"type": "uint256[]"
			},
			{
				"internalType": "uint256[]",
				"name": "quantities",
				"type": "uint256[]"
			},
			{
				"internalType": "enum DexAuction.TokenStandards",
				"name": "tokenStandard",
				"type": "uint8"
			}
		],
		"stateMutability": "view",
		"type": "function",
		"constant": true
	},
	{
		"inputs": [
			{
				"internalType": "string",
				"name": "_auction_type",
				"type": "string"
			},
			{
				"internalType": "address",
				"name": "_NFT_contract_address",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "_asset_token_id",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "_asset_quantity",
				"type": "uint256"
			}
		],
		"name": "createNFTAuction",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "string",
				"name": "_auction_type",
				"type": "string"
			},
			{
				"internalType": "uint256",
				"name": "_basketId",
				"type": "uint256"
			}
		],
		"name": "createBasketAuction",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_auctionId",
				"type": "uint256"
			},
			{
				"internalType": "address",
				"name": "_owner",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "winnningBid",
				"type": "uint256"
			}
		],
		"name": "endAuction",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	}
]