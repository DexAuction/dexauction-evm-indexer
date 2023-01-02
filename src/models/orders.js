const mongoose = require('mongoose');

const order = new mongoose.Schema({
  _id: {
    type: Number,
    unique: true,
    required: true,
  },
  onSaleQuantity: {
    type: Number,
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled'],
    default: 'active',
  },
  sellingMethod: {
    type: String,
    enum: ['fixed-price', 'auction'],
  },
  createdAt: {
    type: Date,
  },
  updatedAt: {
    type: Date,
  },
  auctionId: {
    type: Number,
    required: true,
  },
});

module.exports = mongoose.model('orders', order);
