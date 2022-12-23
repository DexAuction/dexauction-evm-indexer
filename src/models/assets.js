const mongoose = require('mongoose');
const { ASSET_STATUS } = require('../constants');

const asset = new mongoose.Schema({
  _id: {
    type: Number,
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
    enum: [ASSET_STATUS.OFF_SALE, ASSET_STATUS.ON_SALE],
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
asset.set('versionKey', false);
module.exports = mongoose.model('assets', asset);
