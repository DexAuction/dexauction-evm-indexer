const DEFAULT_ASSET_STATUS = 'off-sale';
const ON_SALE_ASSET_STATUS = 'on-sale';

const MINT = 'mint';
const LIST = 'list';
const TRANSFER = 'transfer';
const CANCEL_LIST = 'cancel-list';

const AUCTION = {
   DUTCH_AUCTION : 'dutch',
   ENGLISH_AUCTION : 'english',
}

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

const SUPPORTED_TOKEN_STANDARDS = {
  ERC721: 'ERC-721',
  ERC1155: 'ERC-1155',
}

// To compare with TokenStandard in solidity events
const SUPPORTED_TOKEN_STANDARDS_ENUM = {
  ERC721: '1',
  ERC1155: '2',
}

module.exports = {
  DEFAULT_ASSET_STATUS,
  ON_SALE_ASSET_STATUS,
  MINT,
  LIST,
  TRANSFER,
  CANCEL_LIST,
  AUCTION,
  ZERO_ADDRESS,
  SUPPORTED_TOKEN_STANDARDS,
  SUPPORTED_TOKEN_STANDARDS_ENUM
};
