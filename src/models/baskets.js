const mongoose = require('mongoose');
const { BASKET_STATES } = require('../constants');

const basket = new mongoose.Schema({
  _id: {
    type: Number,
  },

  name: {
    type: String,
  },

  owner: {
    type: String,
    required: true,
  },

  createdBy: {
    type: String,
    required: true,
  },

  state: {
    type: String,
    enum: [
      BASKET_STATES.CREATED,
      BASKET_STATES.LISTED,
      BASKET_STATES.DESTROYED,
    ],
    required: true,
  },

  quantities: {
    type: [Number],
    required: true,
  },

  assetIds: {
    type: [Number],
    required: true,
  },
});
basket.set('timestamps', true);
basket.set('versionKey', false);
module.exports = mongoose.model('baskets', basket);
