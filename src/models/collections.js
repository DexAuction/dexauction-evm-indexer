const mongoose = require('mongoose');

const collection = new mongoose.Schema({
  _id: {
    type: Number,
  },
  tokenStandard: {
    type: String,
    enum: ['ERC-721', 'ERC-1155'],
    required: true,
  },
  displayName: {
    type: String,
    required: true,
  },
  contractName: {
    type: String,
    required: true,
  },
  contractAddress: {
    type: String,
    required: true,
  },
  contractSymbol: {
    type: String,
    required: true,
  },
  categories: {
    type: [String],
  },
  logoImage: {
    type: String,
  },
  bannerImage: {
    type: String,
  },
  description: {
    type: String,
  },
  imported: {
    type: Boolean,
    required: true,
  },
  storeId: {
    type: Number,
    required: true,
  },
});
collection.set('versionKey', false);
module.exports = mongoose.model('collections', collection);
