const DEFAULT_ASSET_STATUS = 'off-sale';
const ON_SALE_ASSET_STATUS = 'on-sale';

const ASSET_HISTORY_EVENTS = {
  MINT: 'mint',
  LIST: 'list',
  TRANSFER: 'transfer',
  CANCEL_LIST: 'cancel-list',
  BASKET_CREATE: 'basket-create',
  BASKET_DESTROY: 'basket-destroy',
};

const BASKET_STATES = {
  CREATED: 'created',
  LISTED: 'listed',
  DESTROYED: 'destroyed',
};

const AUCTION = {
  DUTCH: 'dutch',
  ENGLISH: 'english',
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

module.exports = {
  DEFAULT_ASSET_STATUS,
  ON_SALE_ASSET_STATUS,
  ASSET_HISTORY_EVENTS,
  BASKET_STATES,
  AUCTION,
  ZERO_ADDRESS,
  SUPPORTED_TOKEN_STANDARDS,
  SUPPORTED_TOKEN_STANDARDS_ENUM,
};
