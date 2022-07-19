let NETWORK_CONFIG;
const TEST_NETWORK_PARAMS = {
  START_BLOCK_ENGLISH: "0",
  START_BLOCK_DUTCH: "0",
  HTTP_NETWORK_URL: process.env.HTTP_NETWORK_URL,
  WS_NETWORK_URL: process.env.WS_NETWORK_URL,
  DECENTRALAND_NFT_CONTRACT_ADDRESS:
    process.env.DECENTRALAND_NFT_CONTRACT_ADDRESS,
  ENS_NFT_CONTRACT_ADDRESS: process.env.ENS_NFT_CONTRACT_ADDRESS,
  ENGLISH_AUCTION_ADDRESS: process.env.ENGLISH_AUCTION_ADDRESS,
  PROXY_ADDRESS: process.env.PROXY_ADDRESS,
  DUTCH_CONTRACT_ADDRESS: process.env.DUTCH_CONTRACT_ADDRESS,
};

const NETWORK = process.env.NETWORK || "testnet";
if (NETWORK === "testnet") {
  console.log("Running on testnet");
  NETWORK_CONFIG = TEST_NETWORK_PARAMS;
} else if (NETWORK === "mainnet") {
  console.log("Running on mainnet");
  //   NETWORK_CONFIG = MAIN_NETWORK_PARAMS;
} else {
  throw new Error("Unrecognized network");
}

module.exports = {
  NODE_ENV: process.env.NODE_ENV || "development",
  NETWORK_CONFIG,
  LAST_SYNCED_BLOCK: 0,
};
