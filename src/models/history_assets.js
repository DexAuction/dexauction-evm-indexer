const mongoose = require('mongoose');
const { ASSET_HISTORY_EVENTS } = require('../constants');

const assetHistory = new mongoose.Schema({
  assetId: {
    type: Number,
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
      },
      eventAt: {
        type: Date,
      },
      price: {
        type: Number,
      },
      from: {
        type: String,
      },
      to: {
        type: String,
      },
      assetQuantity: {
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

module.exports = mongoose.model('history_assets', assetHistory);
