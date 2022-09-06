const mongoose = require('mongoose');

const stores = new mongoose.Schema({
  storeId: Number,

  storeName: String,

  network: {
    type: String,
    enum: ['ethererum', 'polygon', 'binance-smart-chain'],
  },

  storeURL: String,

  storeStatus: {
    type: String,
    enum: ['active', 'deactivated'],
  },

  assetCategories: Array,

  auctions: Array,

  email: String,

  createdDate: String,

  publishStatus: {
    type: String,
    enum: ['published', 'unpublished'],
  },
});
module.exports = mongoose.model('stores', stores);
