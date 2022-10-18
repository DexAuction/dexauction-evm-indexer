const mongoose = require('mongoose');

const basket = new mongoose.Schema({
  basketId: {
    type: Number,
  },

  contractAddresses: {
    type: [String],
  },

  assetTokenIds: {
    type: [Number],
  },

  quantities: {
    type: [Number],
  },

  collectionIds: {
    type: [Number],
  },

  fk_collectionIds: {
    type: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'collections',
      },
    ],
  },

  assetIds: {
    type: [Number],
  },

  fk_assetIds: {
    type: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'assets',
      },
    ],
  },
});
basket.set('timestamps', true);
module.exports = mongoose.model('baskets', basket);
