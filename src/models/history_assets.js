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
      price: Number,
      event_date: String,
      event_time: String,
      from: String,
      to: String,
      actions: String,
    },
  ],
});

module.exports = mongoose.model('history_assets', assetHistory);
