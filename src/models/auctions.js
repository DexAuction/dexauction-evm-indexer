const mongoose = require('mongoose');

const auction = new mongoose.Schema({
  auctionId: {
    type: Number,
    unique: true,
  },
  auctionType: {
    type: String,
    enum: ['fpl', 'dutch', 'english', 'sealed-bid', 'vickery'],
  },
  seller: {
    type: String,
  },
  buyer: {
    type: String,
  },
  bidders: {
    type: Array,
  },
  state: {
    type: String,
    enum: [
      'NOT-STARTED',
      'ONGOING',
      'SUCCESSFULLY-COMPLETED',
      'CANCELLED',
      'EXPIRED',
    ],
  },
  englishAuctionAttribute: {
    opening_price: Number,
    current_price: Number,
    min_increment: Number,
    start_datetime: Date,
    end_datetime: Date,
    start_timestamp: Number,
    end_timestamp: Number,
    soft_close_duration: Number,
    winning_bid: Number,
    buyout_price: Number,
    bids: [
      {
        address: String,
        bid: Number,
        bid_timestamp: String,
        txHash: String,
      },
    ],
  },
  dutchAuctionAttribute: {
    opening_price: Number,
    start_datetime: Date,
    start_timestamp: Number,
    round_duration: Number,
    winning_bid: Number,
    reserve_price: Number,
    drop_amount: Number,
  },
  tokenContract: {
    type: String,
  },
  assetTokenId: {
    type: Number,
  },
  assetQuantity: {
    type: Number,
  },
  assetId: {
    type: Number,
  },
  fk_assetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'assets',
  },
  basketId: {
    type: Number,
  },
  fk_basketId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'baskets',
  },
});

auction.set('timestamps', true);

module.exports = mongoose.model('auctions', auction);
