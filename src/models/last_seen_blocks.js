const mongoose = require('mongoose');

const lastSeenBlocks = new mongoose.Schema({
  blockNumberEnglish: {
    type: String,
    required: true,
  },
  blockNumberDutch: {
    type: String,
    required: true,
  },
  blockNumberProxy: {
    type: String,
    required: true,
  },
});
lastSeenBlocks.set('timestamps', true);
lastSeenBlocks.set('versionKey', false);

module.exports = mongoose.model('last_seen_blocks', lastSeenBlocks);
