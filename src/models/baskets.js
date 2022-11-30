const mongoose = require('mongoose');
const { BASKET_STATES } = require('../constants');

const basket = new mongoose.Schema({
  _id: {
    type: Number,
    unique: true,
    required: true,
  },

  name: {
    type: String,
  },

  owner: {
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

  createdBy: {
    type: String,
    required: true,
  },
});
basket.set('timestamps', true);
module.exports = mongoose.model('baskets', basket);
