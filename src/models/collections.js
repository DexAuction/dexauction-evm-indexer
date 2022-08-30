const mongoose = require("mongoose");

const collections = new mongoose.Schema({
  storeId: Number,
  fk_storeId: {
    type: mongoose.Types.ObjectId,
    ref: "stores",
  },
  collectionId: Number,
  tokenStandard: {
    type: String,
    enum: ["ERC-721", "ERC-1155"],
  },
  contractAddress: String,

  logoImage: String,

  bannerImage: String,

  displayName: String,

  contractName: String,

  contractSymbol: String,

  description: String,
});
module.exports = mongoose.model("collections", collections);
