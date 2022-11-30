const axios = require('axios');
const {
  DEFAULT_ASSET_STATUS,
  ASSET_HISTORY_EVENTS,
  AUCTION,
  SUPPORTED_TOKEN_STANDARDS,
  SUPPORTED_TOKEN_STANDARDS_ENUM,
  BASKET_STATES,
} = require('../constants');
const Web3 = require('web3');
const config = require('../config');
const web3 = new Web3(config.NETWORK_CONFIG.WS_NETWORK_URL);
const assetHistoryModel = require('../models/history_assets');
const basketModel = require('../models/baskets');
const auctionModel = require('../models/auctions');
const collectionModel = require('../models/collections');
const assetModel = require('../models/assets');
const NFTContractsModel = require('../models/NFT_contracts');

async function createAssetHelper(
  assetTokenId,
  assetQuantity,
  assetOwner,
  assetMintedBy,
  NFTContract,
  NFTContractInstance,
  dbCollection,
) {
  try {
    console.log('##### Create Asset #######');

    const assetEntry = {
      assetContractAddress: dbCollection.contractAddress,
      assetTokenId: assetTokenId,
      assetQuantity: assetQuantity,
      status: DEFAULT_ASSET_STATUS,
      mintedBy: assetMintedBy,
      metadataURL: '',
      metadataJSON: null,
      owner: assetOwner,
      NFTCollection: NFTContract.name,
      collectionId: dbCollection.collectionId,
      fk_collectionId: dbCollection._id,
    };

    let getTokenURI;

    switch (dbCollection.tokenStandard) {
      // ERC721
      case SUPPORTED_TOKEN_STANDARDS.ERC721: {
        // Get Token URI by calling Smart Contract function
        getTokenURI = await NFTContractInstance.methods
          .tokenURI(assetTokenId)
          .call();
        break;
      }

      // ERC1155
      case SUPPORTED_TOKEN_STANDARDS.ERC1155: {
        // (contractAddr, tokenId, owner) will identify unique asset
        const dbAssetExist = await assetModel.findOne({
          assetContractAddress: dbCollection.contractAddress,
          assetTokenId: assetTokenId,
          owner: assetOwner,
        });

        // If same asset already exists for owner just update the quantity
        if (dbAssetExist) {
          const updatedQuantity =
            parseInt(dbAssetExist.assetQuantity) + parseInt(assetQuantity);
          await dbAssetExist.update({ assetQuantity: updatedQuantity });

          console.log(
            `Updated Asset(assetId: ${dbAssetExist.assetId})`,
            `with updatedQuantity: ${updatedQuantity}`,
          );
          return dbAssetExist.assetId;
        }

        // Get Token URI by calling Smart Contract function
        getTokenURI = await NFTContractInstance.methods
          .uri(assetTokenId)
          .call();
        break;
      }
      default:
        break;
    }

    // Get and update MetadataJSON if TokenURI is present
    if (getTokenURI) {
      assetEntry['metadataURL'] = getTokenURI;
      const resp = await axios.get(getTokenURI);
      if (resp.data) {
        assetEntry['metadataJSON'] = resp.data;
        for (let [key, value] of Object.entries(NFTContract.template)) {
          if (value) {
            assetEntry[key] = resp.data[value];
          }
        }
      }
    }

    assetEntry['assetId'] = (await assetModel.countDocuments()) + 1;
    const dbAsset = new assetModel(assetEntry);
    await dbAsset.save();

    console.log(`Created new Asset(assetId: ${dbAsset.assetId})`);

    // Make empty entry in asset history table
    await emptyAssetHistoryHelper(dbAsset.assetId);

    return dbAsset.assetId;
  } catch (err) {
    console.error(err);
  }
}

async function createBasketHelper(
  basketId,
  nftContracts,
  tokenIds,
  quantities,
  basketOwner,
  tokenStandards,
) {
  try {
    const getBasket = await basketModel.findOne({
      basketId: basketId,
    });

    if (getBasket) {
      console.log('Basket Id already exists');
      return;
    }

    let collectionIds = [];
    let fk_collectionIds = [];
    let assetIds = [];
    let fk_assetsIds = [];
    for (let i = 0; i < nftContracts.length; i++) {
      const getCollection = await collectionModel.findOne({
        contractAddress: nftContracts[i],
      });
      collectionIds.push(getCollection.collectionId);
      fk_collectionIds.push(getCollection._id);

      let dbAssetQuery = {
        assetContractAddress: nftContracts[i],
        assetTokenId: tokenIds[i],
      };
      // To indentify unique ERC1155 asset we need (contract,tokenId,Owner)
      if (tokenStandards[i] === SUPPORTED_TOKEN_STANDARDS_ENUM.ERC1155) {
        dbAssetQuery['owner'] = basketOwner;
      }
      const dbAsset = await assetModel.findOne(dbAssetQuery);
      assetIds.push(dbAsset.assetId);
      fk_assetsIds.push(dbAsset._id);
    }

    const basketEntry = {
      basketId: basketId,
      basketOwner: basketOwner,
      basketState: BASKET_STATES.CREATED,
      contractAddresses: nftContracts,
      assetTokenIds: tokenIds,
      quantities: quantities,
      collectionIds: collectionIds,
      fk_collectionIds: fk_collectionIds,
      assetIds: assetIds,
      fk_assetIds: fk_assetsIds,
    };
    const dbBasket = new basketModel(basketEntry);
    await dbBasket.save();
    console.log(`Created new Basket(basketId: ${dbBasket.basketId})`);
  } catch (err) {
    console.error(err);
  }
}

async function destoryBasketHelper(basketId) {
  console.log(`## Destory Basket(basketId: ${basketId}) ##`);
  await basketModel.updateOne(
    { basketId: basketId },
    { basketState: BASKET_STATES.DESTROYED },
  );
}

async function emptyAssetHistoryHelper(assetId) {
  const dbAsset = await assetModel.findOne({ assetId: assetId });

  const history = {
    assetId: dbAsset.assetId,
    history: [],
  };
  console.log(`Empty asset history initialized for Asset(assetId: ${assetId})`);
  const dbAssetHistory = new assetHistoryModel(history);
  await dbAssetHistory.save();
}

async function mintAssetHistoryHelper(eventLog, assetId, mintQuantity) {
  const dbAsset = await assetModel.findOne({ assetId: assetId });

  const assetHistoryParams = {
    eventAt: dbAsset.createdAt,
    to: dbAsset.owner,
    assetQuantity: mintQuantity,
    actions: config.POLYGON_EXPLORER + '/' + eventLog.transactionHash,
  };
  await assetHistoryDbHelper(
    assetId,
    ASSET_HISTORY_EVENTS.MINT,
    assetHistoryParams,
  );
}

async function basketCreateAssetHistoryHelper(eventLog, basketId) {
  const dbBasket = await basketModel.findOne({ basketId: basketId });

  for (let i = 0; i < dbBasket.assetIds.length; i++) {
    await basketCreateAssetHistoryDbHelper(
      eventLog,
      dbBasket,
      dbBasket.assetIds[i],
      dbBasket.quantities[i],
    );
  }
}

async function basketDestroyAssetHistoryHelper(eventLog, basketId) {
  const dbBasket = await basketModel.findOne({ basketId: basketId });

  for (let i = 0; i < dbBasket.assetIds.length; i++) {
    await basketDestroyAssetHistoryDbHelper(
      eventLog,
      dbBasket,
      dbBasket.assetIds[i],
      dbBasket.quantities[i],
    );
  }
}

async function listAssetHistoryHelper(eventLog, auctionId, auctionType) {
  const dbAuction = await auctionModel.findOne({ auctionId: auctionId });
  let priceVal;
  if (auctionType === AUCTION.DUTCH) {
    priceVal = dbAuction.dutchAuctionAttribute.opening_price;
  } else if (auctionType === AUCTION.ENGLISH) {
    priceVal = dbAuction.englishAuctionAttribute.opening_price;
  }

  // NFT Auction
  if (dbAuction.assetId) {
    const dbAsset = await assetModel.findById(dbAuction.fk_assetId);
    await listAssetHistoryDbHelper(
      eventLog,
      dbAuction,
      dbAsset.assetId,
      dbAuction.assetQuantity,
      priceVal,
    );

    // Basket Auction
  } else if (dbAuction.basketId) {
    const dbBasket = await basketModel.findById(dbAuction.fk_basketId);

    for (let i = 0; i < dbBasket.assetIds.length; i++) {
      await listAssetHistoryDbHelper(
        eventLog,
        dbAuction,
        dbBasket.assetIds[i],
        dbBasket.quantities[i],
        priceVal,
      );
    }
  }
}

async function transferAssetHistoryHelper(
  eventLog,
  auctionId,
  winningBid,
  winner,
) {
  const dbAuction = await auctionModel.findOne({ auctionId: auctionId });

  // NFT Auction
  if (dbAuction.assetId) {
    const dbAsset = await assetModel.findById(dbAuction.fk_assetId);
    const dbCollection = await collectionModel.findById(
      dbAsset.fk_collectionId,
    );
    await _transferAssetHistoryHelper(
      eventLog,
      dbAuction,
      dbCollection,
      dbAsset.assetId,
      dbAsset.assetTokenId,
      dbAuction.assetQuantity,
      winningBid,
      winner,
    );

    // Basket Auction
  } else if (dbAuction.basketId) {
    const dbBasket = await basketModel.findById(dbAuction.fk_basketId);

    for (let i = 0; i < dbBasket.assetIds.length; i++) {
      const dbCollection = await collectionModel.findById(
        dbBasket.fk_collectionIds[i],
      );

      await _transferAssetHistoryHelper(
        eventLog,
        dbAuction,
        dbCollection,
        dbBasket.assetIds[i],
        dbBasket.assetTokenIds[i],
        dbBasket.quantities[i],
        winningBid,
        winner,
      );
    }
  }
}

async function cancelListAssetHistoryHelper(eventLog, auctionId, auctionType) {
  const dbAuction = await auctionModel.findOne({ auctionId: auctionId });
  let priceVal;
  if (auctionType === AUCTION.DUTCH) {
    priceVal = dbAuction.dutchAuctionAttribute.opening_price;
  } else if (auctionType === AUCTION.ENGLISH) {
    priceVal = dbAuction.englishAuctionAttribute.opening_price;
  }

  // NFT Auction
  if (dbAuction.assetId) {
    const dbAsset = await assetModel.findById(dbAuction.fk_assetId);

    await cancelListAssetHistoryDbHelper(
      eventLog,
      dbAuction,
      dbAsset.assetId,
      dbAuction.assetQuantity,
      priceVal,
    );

    // Basket Auction
  } else if (dbAuction.basketId) {
    const dbBasket = await basketModel.findById(dbAuction.fk_basketId);
    for (let i = 0; i < dbBasket.assetIds.length; i++) {
      await cancelListAssetHistoryDbHelper(
        eventLog,
        dbAuction,
        dbBasket.assetIds[i],
        dbBasket.quantities[i],
        priceVal,
      );
    }
  }
}

async function changeOwnership(auctionId, newOwner) {
  console.log('##### Change Asset Ownership #######');
  const dbAuction = await auctionModel.findOne({ auctionId: auctionId });

  // NFT Auction
  if (dbAuction.assetId) {
    const dbAssetOldOwner = await assetModel.findById(dbAuction.fk_assetId);
    if (dbAssetOldOwner) {
      const dbCollection = await collectionModel.findById(
        dbAssetOldOwner.fk_collectionId,
      );

      await _changeOwnership(
        dbAssetOldOwner,
        dbCollection,
        newOwner,
        dbAuction.assetQuantity,
      );
    }

    // Basket Auction
  } else if (dbAuction.basketId) {
    const dbBasket = await basketModel.findById(dbAuction.fk_basketId);
    await dbBasket.update({
      basketOwner: newOwner,
      basketState: BASKET_STATES.DESTROYED,
    });
    console.log(
      `changed basket ownership of Basket(basketId: ${dbBasket.basketId})`,
      `to newOwner: ${newOwner}`,
    );

    for (let i = 0; i < dbBasket.assetIds.length; i++) {
      const dbAssetOldOwner = await assetModel.findById(
        dbBasket.fk_assetIds[i],
      );
      const dbCollection = await collectionModel.findById(
        dbBasket.fk_collectionIds[i],
      );
      const auctionAssetQuantity = dbBasket.quantities[i];

      await _changeOwnership(
        dbAssetOldOwner,
        dbCollection,
        newOwner,
        auctionAssetQuantity,
      );
    }
  }
}

async function _changeOwnership(
  dbAssetOldOwner,
  dbCollection,
  newOwner,
  auctionAssetQuantity,
) {
  switch (dbCollection.tokenStandard) {
    // ERC721
    case SUPPORTED_TOKEN_STANDARDS.ERC721: {
      await assetModel.updateOne(
        { assetId: dbAssetOldOwner.assetId },
        { owner: newOwner },
      );

      console.log(
        `changed ERC721 ownership`,
        `of Asset(assetId: ${dbAssetOldOwner.assetId})`,
        `to newOwner: ${newOwner}`,
      );
      break;
    }

    // ERC1155
    case SUPPORTED_TOKEN_STANDARDS.ERC1155: {
      // Create asset entry for newOwner with assetQuantity from auction
      const nftContract = await NFTContractsModel.findOne({
        tokenContract: dbCollection.contractAddress,
      });
      const nftContractInstance = new web3.eth.Contract(
        JSON.parse(nftContract.abi),
        nftContract.tokenContract,
      );
      await createAssetHelper(
        dbAssetOldOwner.assetTokenId,
        auctionAssetQuantity,
        newOwner,
        dbAssetOldOwner.mintedBy,
        nftContract,
        nftContractInstance,
        dbCollection,
      );

      // Decrease assetQuantity in oldOwner
      const updatedAssetQuantityOldOwner =
        parseInt(dbAssetOldOwner.assetQuantity) -
        parseInt(auctionAssetQuantity);

      await assetModel.updateOne(
        { assetId: dbAssetOldOwner.assetId },
        { assetQuantity: updatedAssetQuantityOldOwner },
      );

      console.log(
        `Updated Old Owner Asset(assetId: ${dbAssetOldOwner.assetId})`,
        `with updatedQuantity: ${updatedAssetQuantityOldOwner}`,
      );
      break;
    }
    default:
      break;
  }
}

async function _transferAssetHistoryHelper(
  eventLog,
  dbAuction,
  dbCollection,
  assetId,
  assetTokenId,
  transferAssetQuantity,
  winningBid,
  winner,
) {
  switch (dbCollection.tokenStandard) {
    // ERC721
    case SUPPORTED_TOKEN_STANDARDS.ERC721: {
      await transferAssetHistoryDbHelper(
        eventLog,
        dbAuction,
        assetId,
        transferAssetQuantity,
        winningBid,
        winner,
      );
      break;
    }

    // ERC1155
    case SUPPORTED_TOKEN_STANDARDS.ERC1155: {
      // Make entry on seller's asset history
      await transferAssetHistoryDbHelper(
        eventLog,
        dbAuction,
        assetId,
        transferAssetQuantity,
        winningBid,
        winner,
      );

      // Make entry on winner's asset history
      const dbAssetNewOwner = await assetModel.findOne({
        assetContractAddress: dbCollection.contractAddress,
        assetTokenId: assetTokenId,
        owner: winner,
      });
      await transferAssetHistoryDbHelper(
        eventLog,
        dbAuction,
        dbAssetNewOwner.assetId,
        transferAssetQuantity,
        winningBid,
        winner,
      );
      break;
    }
    default:
      break;
  }
}

async function basketCreateAssetHistoryDbHelper(
  eventLog,
  dbBasket,
  assetId,
  assetQuantity,
) {
  const assetHistoryParams = {
    eventAt: dbBasket.updatedAt,
    to: dbBasket.basketOwner,
    assetQuantity: assetQuantity,
    basketId: dbBasket.basketId,
    actions: config.POLYGON_EXPLORER + '/' + eventLog.transactionHash,
  };

  await assetHistoryDbHelper(
    assetId,
    ASSET_HISTORY_EVENTS.BASKET_CREATE,
    assetHistoryParams,
  );
}

async function basketDestroyAssetHistoryDbHelper(
  eventLog,
  dbBasket,
  assetId,
  assetQuantity,
) {
  const assetHistoryParams = {
    eventAt: dbBasket.updatedAt,
    to: dbBasket.basketOwner,
    assetQuantity: assetQuantity,
    basketId: dbBasket.basketId,
    actions: config.POLYGON_EXPLORER + '/' + eventLog.transactionHash,
  };

  await assetHistoryDbHelper(
    assetId,
    ASSET_HISTORY_EVENTS.BASKET_DESTROY,
    assetHistoryParams,
  );
}

async function transferAssetHistoryDbHelper(
  eventLog,
  dbAuction,
  assetId,
  assetQuantity,
  winningBid,
  winner,
) {
  const assetHistoryParams = {
    eventAt: dbAuction.updatedAt,
    price: winningBid,
    from: dbAuction.seller,
    to: winner,
    assetQuantity: assetQuantity,
    actions: config.POLYGON_EXPLORER + '/' + eventLog.transactionHash,
  };

  await assetHistoryDbHelper(
    assetId,
    ASSET_HISTORY_EVENTS.TRANSFER,
    assetHistoryParams,
  );
}

async function listAssetHistoryDbHelper(
  eventLog,
  dbAuction,
  assetId,
  assetQuantity,
  price,
) {
  const assetHistoryParams = {
    eventAt: dbAuction.updatedAt,
    price: price,
    from: dbAuction.seller,
    assetQuantity: assetQuantity,
    actions: config.POLYGON_EXPLORER + '/' + eventLog.transactionHash,
  };

  await assetHistoryDbHelper(
    assetId,
    ASSET_HISTORY_EVENTS.LIST,
    assetHistoryParams,
  );
}

async function cancelListAssetHistoryDbHelper(
  eventLog,
  dbAuction,
  assetId,
  assetQuantity,
  price,
) {
  const assetHistoryParams = {
    eventAt: dbAuction.updatedAt,
    price: price,
    from: dbAuction.seller,
    assetQuantity: assetQuantity,
    actions: config.POLYGON_EXPLORER + '/' + eventLog.transactionHash,
  };

  await assetHistoryDbHelper(
    assetId,
    ASSET_HISTORY_EVENTS.CANCEL_LIST,
    assetHistoryParams,
  );
}

async function assetHistoryDbHelper(
  assetId,
  assetHistoryType,
  assetHistoryParams,
) {
  const dbAssetHistory = await assetHistoryModel.findOne({
    assetId: assetId,
  });

  if (dbAssetHistory) {
    await dbAssetHistory.update({
      $push: {
        history: [
          {
            event: assetHistoryType,
            ...assetHistoryParams,
          },
        ],
      },
    });
    console.log(
      `### Event(${assetHistoryType}) added to asset history of`,
      `Asset(assetId: ${assetId})###`,
    );
  } else {
    console.log('Can not find asset history entry with assetId: ', assetId);
  }
  await dbAssetHistory.save();
}

module.exports = {
  createAssetHelper,
  createBasketHelper,
  destoryBasketHelper,
  mintAssetHistoryHelper,
  listAssetHistoryHelper,
  transferAssetHistoryHelper,
  cancelListAssetHistoryHelper,
  basketCreateAssetHistoryHelper,
  basketDestroyAssetHistoryHelper,
  changeOwnership,
};
