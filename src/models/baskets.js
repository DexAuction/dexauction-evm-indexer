const mongoose = require('mongoose');

const basket = new mongoose.Schema({
  basketId: Number,

  contractAddresses: Array,

  assetTokenIds: Array,

  quantities: Array,

  collectionIds: Array,

  fk_collectionIds: Array,

  assetIds: Array,

  fk_assetIds: Array,

  auctionId : Number,

  fk_auctionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'auctions',
  },
});
basket.set('timestamps', true);
module.exports = mongoose.model('baskets', basket);
