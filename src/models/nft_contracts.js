const mongoose = require('mongoose');

//manual entry in this table
const NFTContracts = new mongoose.Schema({
  contractAddress: {
    type: String,
    unique: true,
    required: true,
  },
  // metadataMapping
  template: {
    type: Object,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  lastSeenBlock: {
    type: Number,
    required: true,
  },
  abi: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model('nft_contracts', NFTContracts);
