const mongoose = require("mongoose");
const {DEFAULT_ASSET_STATUS,ON_SALE_ASSET_STATUS} = require("../constants")

const asset = new mongoose.Schema({
  asset_id: {
    type: Number,
  },
  status: {
    type: String,
    enum: [DEFAULT_ASSET_STATUS,ON_SALE_ASSET_STATUS],
  },
  assetContractAddress: {
    type: String,
  },
  assetTokenId: {
    type: Number,
  },
  mintedAt: {
    type: String,
  },
  mintedBy: {
    type: String,
  },
  name: {
    type: String,
  },
  description: {
    type: String,
  },
  image: {
    type: String,
  },
  attributes: {
    type: Object,
  },
  external_url: {
    type: String,
  },
  metadataURL: {
    type: String,
  },
  metadataJSON: {
    type: Object,
  },
  owner: {
    type: String,
  },
  background_image: {
    type: String,
  },
  background_color: {
    type: String,
  },
  collection_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'collections',
  },
  NFTCollection: {
    type: String,
  },
});
asset.set("timestamps", true);
module.exports = mongoose.model('assets', asset);
