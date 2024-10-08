const mongoose = require('mongoose');

const store = new mongoose.Schema({
  _id: {
    type: Number,
  },
  name: {
    type: String,
    required: true,
  },
  network: {
    type: String,
    enum: ['ethererum', 'polygon', 'binance-smart-chain'],
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['active', 'deactivated'],
    required: true,
  },
  categories: {
    type: [String],
  },
  publishStatus: {
    type: String,
    enum: ['published', 'unpublished'],
    required: true,
  },
});

store.set('timestamps', true);
store.set('versionKey', false);
module.exports = mongoose.model('stores', store);
