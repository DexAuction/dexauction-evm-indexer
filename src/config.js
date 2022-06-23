let NETWORK_CONFIG;
//rinkeby
const TEST_NETWORK_PARAMS = {
  START_BLOCK_ENGLISH: "0",
  START_BLOCK_DUTCH: "0",

  //local
  HTTP_NETWORK_URL: "http://localhost:8545",
  WS_NETWORK_URL: "ws://localhost:8545",
  //rinkeby
  // HTTP_NETWORK_URL:"https://rinkeby.infura.io/v3/c021c3fb06f047abb195b0497408dd95",
  // WS_NETWORK_URL: "wss://rinkeby.infura.io/ws/v3/c021c3fb06f047abb195b0497408dd95",

  //rinkeby contract address
  // NFT_CONTRACT_ADDRESS : "0xeD2163B182A39393554cC668FE622A1bB9B075e3",
  // ENGLISH_AUCTION_ADDRESS: "0x8F2C42701c2A83a677a3c58160Bac998493466D4",
  // PROXY_ADDRESS: "0x7eaADe92AFc810B891539A6362B043cddD7a4D6F",
  // DUTCH_CONTRACT_ADDRESS : "0x3A66A98c457a78313D6d6C3ba5b8Aadc95E59d78"

  //local
  NFT_CONTRACT_ADDRESS: "0x2E0Cad774FBA24Df2E286fd2911B9DF176Ebb255",
  ENGLISH_AUCTION_ADDRESS: "0x0F26b4CB242BccF550337507387955Df3f1FDdc5",
  PROXY_ADDRESS: "0xE5Aa85bEDff9D1E5E0EA51F11A2A2260a97096eC",
  DUTCH_CONTRACT_ADDRESS: "0xf91750E21fb617Bc0Da3Cc5a6F8F50D6a5cF7d1d",
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
