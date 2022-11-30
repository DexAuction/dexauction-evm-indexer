const mongoose = require('mongoose');
const { DEFAULT_ASSET_STATUS, ON_SALE_ASSET_STATUS } = require('../constants');

const asset = new mongoose.Schema({
  _id: {
    type: Number,
    unique: true,
    required: true,
  },
  owner: {
    type: String,
    required: true,
  },
  mintedBy: {
    type: String,
    required: true,
  },
  tokenId: {
    type: Number,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  metadataURL: {
    type: String,
  },
  metadataJSON: {
    type: Object,
  },
  categories: {
    type: [String],
  },
  saleStatus: {
    type: String,
    enum: [DEFAULT_ASSET_STATUS, ON_SALE_ASSET_STATUS],
    required: true,
  },
  royaltyPercentage: {
    type: Number,
  },
  collectionId: {
    type: Number,
    required: true,
  },
});
asset.set('timestamps', true);
module.exports = mongoose.model('assets', asset);
