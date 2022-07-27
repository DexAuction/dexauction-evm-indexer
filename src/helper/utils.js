const Web3 = require("web3");
const axios = require("axios");
const config = require("../config");
const web3 = new Web3(config.NETWORK_CONFIG.WS_NETWORK_URL);
const assetModel = require("../models/asset");
const masterModel = require("../models/NFTContractTemplate");
const {
  DECENTRALAND_NFT_CONTRACT_ABI,
  ENS_NFT_CONTRACT_ABI
} = require("../abi");

const DecentralandAssetContract = new web3.eth.Contract(
  DECENTRALAND_NFT_CONTRACT_ABI,
  config.NETWORK_CONFIG.DECENTRALAND_NFT_CONTRACT_ADDRESS
);
const ENSAssetContract = new web3.eth.Contract(
  ENS_NFT_CONTRACT_ABI,
  config.NETWORK_CONFIG.ENS_NFT_CONTRACT_ADDRESS
);
async function createAsset(txhash, assetOwner) {
  const txDetail = await web3.eth.getTransactionReceipt(txhash);
  for (item of txDetail.logs) {
    if (
      item.address == config.NETWORK_CONFIG.DECENTRALAND_NFT_CONTRACT_ADDRESS ||
      item.address == config.NETWORK_CONFIG.ENS_NFT_CONTRACT_ADDRESS
    ) {
      if (
        item.topics[0] ==
        "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
      ) {
        const to = web3.eth.abi.decodeParameter("address", item.topics[2]);
        const assetTokenId = web3.eth.abi.decodeParameter(
          "uint256",
          item.topics[3]
        );
        if (
          to.toLowerCase() == config.NETWORK_CONFIG.PROXY_ADDRESS.toLowerCase()
        ) {
          const getTemplate = await masterModel.findOne({
            tokenContract: item.address
          });

          let getTokenURI;
          switch (item.address) {
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
              assetContractAddress: item.address,
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
              NFTCollection: getTemplate.name
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
      }
    }
  }
}

module.exports = {
  createAsset
};
