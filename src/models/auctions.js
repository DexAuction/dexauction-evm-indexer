const mongoose = require('mongoose');

const auction = new mongoose.Schema({
  _id: {
    type: Number,
    unique: true,
    required: true,
  },
  type: {
    type: String,
    enum: ['fpl', 'dutch', 'english', 'sealed-bid', 'vickery'],
    required: true,
  },
  seller: {
    type: String,
    required: true,
  },
  buyer: {
    type: String,
  },
  bidders: {
    type: [String],
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
    required: true,
  },
  englishAuctionAttribute: {
    openingPrice: {
      type: Number,
    },
    currentPrice: {
      type: Number,
    },
    minIncrement: {
      type: Number,
    },
    startDatetime: {
      type: Date,
    },
    endDatetime: {
      type: Date,
    },
    startTimestamp: {
      type: Number,
    },
    endTimestamp: {
      type: Number,
    },
    softCloseDuration: {
      type: Number,
    },
    winningBid: {
      type: Number,
    },
    buyoutPrice: {
      type: Number,
    },
    bids: [
      {
        address: {
          type: String,
        },
        bid: {
          type: Number,
        },
        bidTimestamp: {
          type: String,
        },
        txHash: {
          type: String,
        },
      },
    ],
  },
  dutchAuctionAttribute: {
    openingPrice: {
      type: Number,
    },
    startDatetime: {
      type: Date,
    },
    startTimestamp: {
      type: Number,
    },
    roundDuration: {
      type: Number,
    },
    winningBid: {
      type: Number,
    },
    reservePrice: {
      type: Number,
    },
    dropAmount: {
      type: Number,
    },
  },
  inventoryType: {
    type: String,
    enum: ['asset', 'basket'],
    required: true,
  },
  inventoryId: {
    type: Number,
    required: true,
  },
  assetQuantity: {
    type: Number,
  },
});

auction.set('timestamps', true);

module.exports = mongoose.model('auctions', auction);
