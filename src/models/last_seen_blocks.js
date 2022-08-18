const mongoose = require("mongoose");

const last_seen_blocks = new mongoose.Schema({
  blockNumberEnglish: {
    type: String,
    required: true,
  },
  blockNumberDutch: {
    type: String,
    required: true,
  },
  blockNumberDecentralandNFT: {
    type: String,
    required: true,
  },
  blockNumberENSNFT: {
    type: String,
    required: true,
  }
});
last_seen_blocks.set("timestamps", true);

module.exports = mongoose.model("last_seen_blocks", last_seen_blocks);
