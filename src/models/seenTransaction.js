const mongoose = require('mongoose');

const seen_transaction = new mongoose.Schema({
  transactionHash: {
    type: String,
    required: true,
  },
  blockNumber: {
    type: Number,
    required: true,
  },
  eventLog: {
    type: Object,
    required: true,
  },
  state: {
    type: String,
    enum: ['APPLIED'],
  },
});
seen_transaction.set('timestamps', true);

module.exports = mongoose.model('seen_transaction', seen_transaction);
