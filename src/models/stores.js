const mongoose = require('mongoose');

const store = new mongoose.Schema({
  storeId: {
    type: Number,
  },
  storeName: {
    type: String,
  },
  network: {
    type: String,
    enum: ['ethererum', 'polygon', 'binance-smart-chain'],
  },
  storeURL: {
    type: String,
  },
  storeStatus: {
    type: String,
    enum: ['active', 'deactivated'],
  },
  assetCategories: {
    type: [String],
  },
  auctions: {
    type: [String],
  },
  email: {
    type: String,
  },
  publishStatus: {
    type: String,
    enum: ['published', 'unpublished'],
  },
});
module.exports = mongoose.model('stores', store);
