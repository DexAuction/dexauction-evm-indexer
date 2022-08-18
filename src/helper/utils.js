const Web3 = require("web3");
const axios = require("axios");
const config = require("../config");
const web3 = new Web3(config.NETWORK_CONFIG.WS_NETWORK_URL);
const assetModel = require("../models/asset");
const masterModel = require("../models/NFTContractTemplate");
const {
  DECENTRALAND_NFT_CONTRACT_ABI,
  ENS_NFT_CONTRACT_ABI,
} = require("../abi");

const DecentralandAssetContract = new web3.eth.Contract(
  DECENTRALAND_NFT_CONTRACT_ABI,
  config.NETWORK_CONFIG.DECENTRALAND_NFT_CONTRACT_ADDRESS
);
const ENSAssetContract = new web3.eth.Contract(
  ENS_NFT_CONTRACT_ABI,
  config.NETWORK_CONFIG.ENS_NFT_CONTRACT_ADDRESS
);
async function createAsset(Eventlog, assetTokenId, assetOwner) {
  const getTemplate = await masterModel.findOne({
    tokenContract: Eventlog.address,
  });

  let getTokenURI;
  switch (Eventlog.address) {
    case config.NETWORK_CONFIG.DECENTRALAND_NFT_CONTRACT_ADDRESS:
      getTokenURI = await DecentralandAssetContract.methods
        .tokenURI(assetTokenId)
        .call();
      break;
    case config.NETWORK_CONFIG.ENS_NFT_CONTRACT_ADDRESS:
      getTokenURI = await ENSAssetContract.methods
        .tokenURI(assetTokenId)
        .call();
      break;
    default:
      break;
  }

  try {
    console.log("##### Create Asset #######");
    const resp = await axios.get(getTokenURI);

    const assetEntry = {
      assetContractAddress: Eventlog.address,
      assetTokenId: assetTokenId,
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
      NFTCollection: getTemplate.name,
    };

    for (let [key, value] of Object.entries(getTemplate.template)) {
      if (value) {
        assetEntry[key] = resp.data[value];
      }
    }
    assetEntry["NFTCollection"] = getTemplate.name;
    const dbAsset = new assetModel(assetEntry);
    await dbAsset.save();
  } catch (err) {
    console.error(err);
  }
}

module.exports = {
  createAsset,
};
