const axios = require('axios');
const assetModel = require('../models/asset');
const collectionModel = require('../models/collections');
const { DEFAULT_ASSET_STATUS, MINT } = require('../constants');
const config = require('../config');
const assetHistoryModel = require('../models/history_assets');

async function createAssetHelper(
  Eventlog,
  assetTokenId,
  assetOwner,
  NFTContract,
  NFTContractInstance,
) {
  let getTokenURI;
  getTokenURI = await NFTContractInstance.methods.tokenURI(assetTokenId).call();
  try {
    const getCollection = await collectionModel.findOne({
      contractAddress: Eventlog.address,
    });
    console.log('##### Create Asset #######');
    const resp = await axios.get(getTokenURI);

    const assetEntry = {
      assetContractAddress: Eventlog.address,
      collectionId: getCollection.collectionId,
      fk_collectionId: getCollection._id,
      assetTokenId: assetTokenId,
      status: DEFAULT_ASSET_STATUS,
      mintedAt: '',
      mintedBy: assetOwner,
      name: '',
      description: '',
      image: '',
      attributes: null,
      external_url: '',
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
    assetEntry['NFTCollection'] = NFTContract.name;

    assetEntry['assetId'] = (await assetModel.countDocuments()) + 1;
    const dbAsset = new assetModel(assetEntry);
    await dbAsset.save();
    // mint details in asset history

    const history = {
      assetId: dbAsset.assetId,
      history: [
        {
          event: MINT,
          event_date: dbAsset.createdAt.toLocaleDateString(),
          event_time: dbAsset.createdAt.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
          to: dbAsset.owner,
          actions: config.POLYGON_EXPLORER + '/' + Eventlog.transactionHash,
        },
      ],
    };
    console.log('### Mint Asset history in asset history table ###');

    const dbAssetHistory = new assetHistoryModel(history);
    await dbAssetHistory.save();
  } catch (err) {
    console.error(err);
  }
}

module.exports = {
  createAssetHelper,
};
