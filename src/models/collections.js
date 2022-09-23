const mongoose = require("mongoose");

const collections = new mongoose.Schema({
  collectionId: {
    type: Number,
  },
  tokenStandard: {
    type: String,
    enum: ["ERC-721", "ERC-1155"],
  },
  contractAddress: {
    type: String,
  },
  logoImage: {
    type: String,
  },
  bannerImage: {
    type: String,
  },
  displayName: {
    type: String,
  },
  contractName: {
    type: String,
  },
  contractSymbol: {
    type: String,
  },
  description: {
    type: String,
  },
  storeId: {
    type: Number,
  },
  fk_storeId: {
    type: mongoose.Types.ObjectId,
    ref: "stores",
  },
});
module.exports = mongoose.model("collections", collections);
