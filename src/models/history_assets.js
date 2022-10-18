const mongoose = require('mongoose');
const { MINT, LIST, TRANSFER, CANCEL_LIST } = require('../constants');

const assetHistory = new mongoose.Schema({
  assetId: {
    type: Number,
  },
  history: [
    {
      event: {
        type: String,
        enum: [LIST, MINT, TRANSFER,CANCEL_LIST],
      },
      price: {
        type: Number,
      },
      event_date: {
        type: String,
      },
      event_time: {
        type: String,
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
      actions: {
        type: String,
      },
    },
  ],
});

module.exports = mongoose.model('history_assets', assetHistory);
