const ASSET_HISTORY_EVENTS = {
  MINT: 'mint',
  LIST: 'list',
  TRANSFER: 'transfer',
  CANCEL_LIST: 'cancel-list',
  BASKET_CREATE: 'basket-create',
  BASKET_LIST: 'basket-list',
  BASKET_CANCEL_LIST: 'basket-cancel-list',
  BASKET_DESTROY: 'basket-destroy',
};

const ASSET_STATUS = {
  OFF_SALE: 'off-sale',
  ON_SALE: 'on-sale',
};

const BASKET_STATES = {
  OFF_SALE: 'off-sale',
  ON_SALE: 'on-sale',
  DESTROYED: 'destroyed',
};

const AUCTION = {
  DUTCH: 'dutch',
  ENGLISH: 'english',
};

const AUCTION_STATE = {
  NOT_STARTED: 'NOT-STARTED',
  ONGOING: 'ONGOING',
  SUCCESSFULLY_COMPLETED: 'SUCCESSFULLY-COMPLETED',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
};

const INVENTORY_TYPE = {
  ASSET: 'asset',
  BASKET: 'basket',
};

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const SUPPORTED_TOKEN_STANDARDS = {
  ERC721: 'ERC-721',
  ERC1155: 'ERC-1155',
};

// To compare with TokenStandard in solidity events
const SUPPORTED_TOKEN_STANDARDS_ENUM = {
  ERC721: '1',
  ERC1155: '2',
};

const SUPPORTED_BLOCKCHAIN_NETWORK = {
  POLYGON: 'polygon',
  ETHEREUM: 'ethereum',
};
module.exports = {
  ASSET_HISTORY_EVENTS,
  ASSET_STATUS,
  BASKET_STATES,
  AUCTION,
  AUCTION_STATE,
  INVENTORY_TYPE,
  ZERO_ADDRESS,
  SUPPORTED_TOKEN_STANDARDS,
  SUPPORTED_TOKEN_STANDARDS_ENUM,
  SUPPORTED_BLOCKCHAIN_NETWORK,
};
