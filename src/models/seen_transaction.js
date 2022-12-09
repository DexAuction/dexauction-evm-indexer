const mongoose = require('mongoose');

const seenTransaction = new mongoose.Schema({
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
    required: true,
  },
});
seenTransaction.set('timestamps', true);
seenTransaction.set('versionKey', false);
module.exports = mongoose.model('seen_transaction', seenTransaction);
