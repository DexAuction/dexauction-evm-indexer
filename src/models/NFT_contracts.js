const mongoose = require('mongoose');

//manual entry in this table
const NFT_contracts = new mongoose.Schema({
  tokenContract: {
    type: String,
    unique: true,
  },
  // metadataMapping
  template: {
    type: Object,
  },
  name: {
    type: String,
  },
  lastSeenBlock: {
    type: Number,
  },
  abi: {
    type: String,
  },
});

module.exports = mongoose.model('NFT_contracts', NFT_contracts);
