let NETWORK_CONFIG;
const TEST_NETWORK_PARAMS = {
  START_BLOCK_ENGLISH: '0',
  START_BLOCK_DUTCH: '0',
  START_BLOCK_PROXY: '0',
  HTTP_NETWORK_URL: process.env.HTTP_NETWORK_URL,
  WS_NETWORK_URL: process.env.WS_NETWORK_URL,
  MYNEERC721_NFT_CONTRACT_ADDRESS: process.env.MYNEERC721_NFT_CONTRACT_ADDRESS,
  MYNEERC1155_NFT_CONTRACT_ADDRESS:
    process.env.MYNEERC1155_NFT_CONTRACT_ADDRESS,
  ENGLISH_AUCTION_ADDRESS: process.env.ENGLISH_AUCTION_ADDRESS,
  PROXY_ADDRESS: process.env.PROXY_ADDRESS,
  DUTCH_CONTRACT_ADDRESS: process.env.DUTCH_CONTRACT_ADDRESS,
};
const LOCAL_NETWORK_PARAMS = {
  START_BLOCK_ENGLISH: '0',
  START_BLOCK_DUTCH: '0',
  START_BLOCK_PROXY: '0',
  HTTP_NETWORK_URL: process.env.HTTP_NETWORK_URL,
  WS_NETWORK_URL: process.env.WS_NETWORK_URL,
  MYNEERC721_NFT_CONTRACT_ADDRESS: process.env.MYNEERC721_NFT_CONTRACT_ADDRESS,
  MYNEERC1155_NFT_CONTRACT_ADDRESS:
    process.env.MYNEERC1155_NFT_CONTRACT_ADDRESS,
  ENGLISH_AUCTION_ADDRESS: process.env.ENGLISH_AUCTION_ADDRESS,
  PROXY_ADDRESS: process.env.PROXY_ADDRESS,
  DUTCH_CONTRACT_ADDRESS: process.env.DUTCH_CONTRACT_ADDRESS,
};
const MAIN_NETWORK_PARAMS = {
  START_BLOCK_ENGLISH: '0',
  START_BLOCK_DUTCH: '0',
  START_BLOCK_PROXY: '0',
  HTTP_NETWORK_URL: process.env.HTTP_NETWORK_URL,
  WS_NETWORK_URL: process.env.WS_NETWORK_URL,
  MYNEERC721_NFT_CONTRACT_ADDRESS: process.env.MYNEERC721_NFT_CONTRACT_ADDRESS,
  MYNEERC1155_NFT_CONTRACT_ADDRESS:
    process.env.MYNEERC1155_NFT_CONTRACT_ADDRESS,
  ENGLISH_AUCTION_ADDRESS: process.env.ENGLISH_AUCTION_ADDRESS,
  PROXY_ADDRESS: process.env.PROXY_ADDRESS,
  DUTCH_CONTRACT_ADDRESS: process.env.DUTCH_CONTRACT_ADDRESS,
};

const NETWORK = process.env.NETWORK || 'testnet';
if (NETWORK === 'testnet') {
  console.log('Running on testnet');
  NETWORK_CONFIG = TEST_NETWORK_PARAMS;
} else if (NETWORK === 'mainnet') {
  console.log('Running on mainnet');
  NETWORK_CONFIG = MAIN_NETWORK_PARAMS;
} else if (NETWORK === 'local') {
  console.log('Running on local');
  NETWORK_CONFIG = LOCAL_NETWORK_PARAMS;
} else {
  throw new Error('Unrecognized network');
}

const EVENT_TOPIC_SIGNATURES = {
  BASKET_CREATE:
    '0x174359be5e2910eb7f2128825ff58360fecf5dba07db61a247316caa4a78a2bd',
  BASKET_DESTROY:
    '0xcb0adf6d97a2fcf03d38246d02cab681206c240bad01985abb7f7e8961e042d1',
  AUCTION_CREATE_PROXY:
    '0x1b256150dbdb425158cbad6353c2c0e33bcba4218f5e000f7327cec33191b3c8',
  BASKET_AUCTION_CREATE_PROXY:
    '0xc294e1b1839fd6d46673b4b12423aeda38a49c5b1b6c2538625de4c52104eefb',

  DUTCH_AUCTION_CREATE:
    '0xe793ffbd8d1d9749a0cdd9b308cea8716ce980a0fd4c6d3ff797fee30b6b8d36',
  DUTCH_CONFIGURE_AUCTION:
    '0x255ccde09f1e6a77a079ebaf1a0ccbc1818536941c520900a72cf02320212cad',
  DUTCH_ACCEPT_PRICE:
    '0x62a3911748f292afd602f561751a05168762f64ee07098921650dba582fca0d6',
  DUTCH_AUCTION_CANCEL:
    '0x1d30295566a0ab516b4cd02b8875bb7e3c7e83307b7cdeb0966216825ab5e4be',

  ENGLISH_AUCTION_CREATE:
    '0x5f6e9130c3f991e5678d5df51f9547926db4b428e3bfdf539f463a0f6416e42c',
  ENGLISH_CONFIGURE_AUCTION:
    '0x778db73461320c581d7308b972ca3e9c16ffce06149dc94175298d0d03365cf2',
  ENGLISH_PLACE_BID:
    '0x5f40cf581002f0c6368477b76b97ed3bab00a2804aee9ec09328cbcbc5304aec',
  ENGLISH_AUCTION_END:
    '0x63205d4b0571673d9c1d2319c4a2ed023943c9757f110eefffb8e2c1decdd160',
  ENGLISH_AUCTION_CANCEL:
    '0x1d30295566a0ab516b4cd02b8875bb7e3c7e83307b7cdeb0966216825ab5e4be',
  ENGLISH_AUCTION_COMPLETE:
    '0x76176cce0ff2d1acbd12eeb335774966211b60f9b0e673348f6168a9ae2f66fb',

  ZERO_TOPIC:
    '0x0000000000000000000000000000000000000000000000000000000000000000',
  ERC721_TRANSFER:
    '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
  ERC1155_TRANSFER_SINGLE:
    '0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62',
  ERC1155_TRANSFER_BATCH:
    '0x4a39dc06d4c0dbc64b70af90fd698a233a518aa5d07e595d983b8c0526c8f7fb',
};

module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  CONFIRMATION_COUNT: process.env.CONFIRMATION_COUNT || 10,
  NETWORK_CONFIG,
  LAST_SYNCED_BLOCK: 0,
  POLYGON_EXPLORER: process.env.POLYGON_EXPLORER,
  EVENT_TOPIC_SIGNATURES,
};
