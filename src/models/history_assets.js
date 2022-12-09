const mongoose = require('mongoose');
const { ASSET_HISTORY_EVENTS } = require('../constants');

const assetHistory = new mongoose.Schema({
  assetId: {
    type: Number,
    required: true,
  },
  history: [
    {
      event: {
        type: String,
        enum: [
          ASSET_HISTORY_EVENTS.MINT,
          ASSET_HISTORY_EVENTS.LIST,
          ASSET_HISTORY_EVENTS.TRANSFER,
          ASSET_HISTORY_EVENTS.CANCEL_LIST,
          ASSET_HISTORY_EVENTS.BASKET_CREATE,
          ASSET_HISTORY_EVENTS.BASKET_DESTROY,
        ],
        required: true,
      },
      eventAt: {
        type: Date,
        required: true,
      },
      to: {
        type: String,
      },
      from: {
        type: String,
      },
      price: {
        type: Number,
      },
      quantity: {
        type: Number,
      },
      basketId: {
        type: Number,
      },
      actions: {
        type: String,
      },
    },
  ],
});

assetHistory.set('versionKey', false);
module.exports = mongoose.model('history_assets', assetHistory);
