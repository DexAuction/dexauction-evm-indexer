const axios = require("axios");
const assetModel = require("../models/asset");
const collectionModel = require("../models/collections");
const {DEFAULT_ASSET_STATUS} = require("../constants")

async function createAssetHelper(
  Eventlog,
  assetTokenId,
  assetOwner,
  NFTContract,
  NFTContractInstance
) {
  let getTokenURI;
  getTokenURI = await NFTContractInstance.methods.tokenURI(assetTokenId).call();
  try {
    const getCollection = await collectionModel.findOne({
      contractAddress: Eventlog.address,
    });
    console.log("##### Create Asset #######");
    const resp = await axios.get(getTokenURI);

    const assetEntry = {
      assetContractAddress: Eventlog.address,
      collection_id: getCollection._id,
      assetTokenId: assetTokenId,
      status:DEFAULT_ASSET_STATUS,
      mintedAt: "",
      mintedBy: "",
      name: "",
      description: "",
      image: "",
      attributes: null,
      external_url: "",
      metadataURL: getTokenURI,
      metadataJSON: resp.data,
      owner: assetOwner,
      background_image: null,
      background_color: null,
      NFTCollection: NFTContract.name,
    };
    for (let [key, value] of Object.entries(NFTContract.template)) {
      if (value) {
        assetEntry[key] = resp.data[value];
      }
    }
    assetEntry["NFTCollection"] = NFTContract.name;

    assetEntry["asset_id"] = (await assetModel.countDocuments()) + 1;
    const dbAsset = new assetModel(assetEntry);
    await dbAsset.save();
  } catch (err) {
    console.error(err);
  }
}

module.exports = {
  createAssetHelper,
};
