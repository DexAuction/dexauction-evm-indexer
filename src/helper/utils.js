const axios = require('axios');
const {
  ASSET_HISTORY_EVENTS,
  AUCTION,
  SUPPORTED_TOKEN_STANDARDS,
  SUPPORTED_TOKEN_STANDARDS_ENUM,
  BASKET_STATES,
  INVENTORY_TYPE,
  ASSET_STATUS,
  SUPPORTED_BLOCKCHAIN_NETWORK,
} = require('../constants');
const Web3 = require('web3');
const config = require('../config');
const web3 = new Web3(config.NETWORK_CONFIG.WS_NETWORK_URL);
const assetHistoryModel = require('../models/history_assets');
const basketModel = require('../models/baskets');
const auctionModel = require('../models/auctions');
const collectionModel = require('../models/collections');
const assetModel = require('../models/assets');
const NFTContractsModel = require('../models/nft_contracts');

async function createAssetHelper(
  assetTokenId,
  assetQuantity,
  assetOwner,
  assetMintedBy,
  NFTContractInstance,
  dbCollection,
) {
  try {
    console.log('##### Create Asset #######');

    const assetEntry = {
      owner: assetOwner,
      mintedBy: assetMintedBy,
      metadataURL: '',
      metadataJSON: null,
      tokenId: assetTokenId,
      quantity: assetQuantity,
      saleStatus: ASSET_STATUS.OFF_SALE,
      collectionId: dbCollection._id,
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
        // (collection, tokenId, owner) will identify unique asset
        const dbAssetExist = await assetModel.findOne({
          collectionId: dbCollection._id,
          tokenId: assetTokenId,
          owner: assetOwner,
        });

        // If same asset already exists for owner just update the quantity
        if (dbAssetExist) {
          const updatedQuantity =
            parseInt(dbAssetExist.quantity) + parseInt(assetQuantity);
          await dbAssetExist.updateOne({ quantity: updatedQuantity });

          console.log(
            `Updated Asset(assetId: ${dbAssetExist._id})`,
            `with updatedQuantity: ${updatedQuantity}`,
          );
          return dbAssetExist;
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
      let resp;
      try {
        resp = await axios.get(getTokenURI);
      } catch (err) {
        console.error('Axios Error: ', err.message);
      }

      if (resp && resp.data) {
        assetEntry['metadataJSON'] = resp.data;
      }
    }

    assetEntry['_id'] = (await assetModel.countDocuments()) + 1;
    const dbAsset = new assetModel(assetEntry);
    await dbAsset.save();

    console.log(`Created new Asset(assetId: ${dbAsset._id})`);

    return dbAsset;
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
      _id: basketId,
    });

    if (getBasket) {
      console.log('Basket Id already exists');
      return;
    }

    let assetIds = [];
    for (let i = 0; i < nftContracts.length; i++) {
      const getCollection = await collectionModel.findOne({
        contractAddress: nftContracts[i],
      });

      let dbAssetQuery = {
        collectionId: getCollection._id,
        tokenId: tokenIds[i],
      };
      // To indentify unique ERC1155 asset we need (contract,tokenId,Owner)
      if (tokenStandards[i] === SUPPORTED_TOKEN_STANDARDS_ENUM.ERC1155) {
        dbAssetQuery['owner'] = basketOwner;
      }
      const dbAsset = await assetModel.findOne(dbAssetQuery);
      assetIds.push(dbAsset._id);
    }

    const basketEntry = {
      _id: basketId,
      owner: basketOwner,
      createdBy: basketOwner,
      state: BASKET_STATES.OFF_SALE,
      quantities: quantities,
      assetIds: assetIds,
    };
    const dbBasket = new basketModel(basketEntry);
    await dbBasket.save();
    console.log(`Created new Basket(basketId: ${dbBasket._id})`);
    return dbBasket;
  } catch (err) {
    console.error(err);
  }
}

async function destoryBasketHelper(basketId) {
  console.log(`## Destory Basket(basketId: ${basketId}) ##`);
  await basketModel.updateOne(
    { _id: basketId },
    { state: BASKET_STATES.DESTROYED },
  );
}

async function mintAssetHistoryHelper(eventLog, dbAsset, mintQuantity) {
  const assetHistoryParams = {
    eventAt: dbAsset.updatedAt,
    to: dbAsset.owner,
    quantity: mintQuantity,
    actions: config.POLYGON_EXPLORER + '/' + eventLog.transactionHash,
  };
  await assetHistoryDbHelper(
    dbAsset._id,
    ASSET_HISTORY_EVENTS.MINT,
    assetHistoryParams,
  );
}

async function basketCreateAssetHistoryHelper(eventLog, dbBasket) {
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
  const dbBasket = await basketModel.findOne({ _id: basketId });
  if (!dbBasket) {
    console.log(
      `Can't find Basket(id: ${basketId}) in basketDestroyAssetHistoryHelper`,
    );
  }

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
  const dbAuction = await auctionModel.findOne({ _id: auctionId });
  if (!dbAuction) {
    console.log(
      `Can't find Auction(id: ${auctionId}) in listAssetHistoryHelper`,
    );
  }

  let priceVal;
  if (auctionType === AUCTION.DUTCH) {
    priceVal = dbAuction.dutchAuctionAttribute.openingPrice;
  } else if (auctionType === AUCTION.ENGLISH) {
    priceVal = dbAuction.englishAuctionAttribute.openingPrice;
  }

  // NFT Auction
  if (dbAuction.inventoryType === INVENTORY_TYPE.ASSET) {
    const dbAsset = await assetModel.findOne({ _id: dbAuction.inventoryId });

    // Update Asset status to on-sale
    await dbAsset.updateOne({ saleStatus: ASSET_STATUS.ON_SALE });

    // Make List event entry in asset history
    await listAssetHistoryDbHelper(
      eventLog,
      dbAuction,
      dbAsset._id,
      dbAuction.assetQuantity,
      priceVal,
    );

    // Basket Auction
  } else if (dbAuction.inventoryType === INVENTORY_TYPE.BASKET) {
    const dbBasket = await basketModel.findOne({ _id: dbAuction.inventoryId });

    for (let i = 0; i < dbBasket.assetIds.length; i++) {
      // Update Asset status to on-sale
      await assetModel.updateOne(
        { _id: dbBasket.assetIds[i] },
        { saleStatus: ASSET_STATUS.ON_SALE },
      );

      // Make Basket List event entry in asset history
      await basketListAssetHistoryDbHelper(
        eventLog,
        dbBasket,
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
  const dbAuction = await auctionModel.findOne({ _id: auctionId });
  if (!dbAuction) {
    console.log(
      `Can't find Auction(id: ${auctionId}) in transferAssetHistoryHelper`,
    );
  }

  // NFT Auction
  if (dbAuction.inventoryType === INVENTORY_TYPE.ASSET) {
    const dbAsset = await assetModel.findOne({ _id: dbAuction.inventoryId });
    const dbCollection = await collectionModel.findOne({
      _id: dbAsset.collectionId,
    });
    await _transferAssetHistoryHelper(
      eventLog,
      dbAuction,
      dbCollection,
      dbAsset._id,
      dbAsset.tokenId,
      dbAuction.assetQuantity,
      winningBid,
      winner,
    );

    // Basket Auction
  } else if (dbAuction.inventoryType === INVENTORY_TYPE.BASKET) {
    const dbBasket = await basketModel.findOne({ _id: dbAuction.inventoryId });

    for (let i = 0; i < dbBasket.assetIds.length; i++) {
      const dbAsset = await assetModel.findOne({ _id: dbBasket.assetIds[i] });
      const dbCollection = await collectionModel.findOne({
        _id: dbAsset.collectionId,
      });

      await _transferAssetHistoryHelper(
        eventLog,
        dbAuction,
        dbCollection,
        dbBasket.assetIds[i],
        dbAsset.tokenId,
        dbBasket.quantities[i],
        winningBid,
        winner,
      );
    }
  }
}

async function cancelListAssetHistoryHelper(eventLog, auctionId, auctionType) {
  const dbAuction = await auctionModel.findOne({ _id: auctionId });
  if (!dbAuction) {
    console.log(
      `Can't find Auction(id: ${auctionId}) in cancelListAssetHistoryHelper`,
    );
  }

  let priceVal;
  if (auctionType === AUCTION.DUTCH) {
    priceVal = dbAuction.dutchAuctionAttribute.openingPrice;
  } else if (auctionType === AUCTION.ENGLISH) {
    priceVal = dbAuction.englishAuctionAttribute.openingPrice;
  }

  // NFT Auction
  if (dbAuction.inventoryType === INVENTORY_TYPE.ASSET) {
    const dbAsset = await assetModel.findOne({ _id: dbAuction.inventoryId });

    // Update Asset status to off-sale
    await dbAsset.updateOne({ saleStatus: ASSET_STATUS.OFF_SALE });

    // Make Cancel List event entry in asset history
    await cancelListAssetHistoryDbHelper(
      eventLog,
      dbAuction,
      dbAsset._id,
      dbAuction.assetQuantity,
      priceVal,
    );

    // Basket Auction
  } else if (dbAuction.inventoryType === INVENTORY_TYPE.BASKET) {
    const dbBasket = await basketModel.findOne({ _id: dbAuction.inventoryId });

    for (let i = 0; i < dbBasket.assetIds.length; i++) {
      // Update Asset status to off-sale
      await assetModel.updateOne(
        { _id: dbBasket.assetIds[i] },
        { saleStatus: ASSET_STATUS.OFF_SALE },
      );

      // Make Basket Cancel List event entry in asset history
      await basketCancelListAssetHistoryDbHelper(
        eventLog,
        dbBasket,
        dbBasket.assetIds[i],
        dbBasket.quantities[i],
        priceVal,
      );
    }
  }
}

async function changeOwnership(auctionId, newOwner) {
  console.log('##### Change Asset Ownership #######');
  const dbAuction = await auctionModel.findOne({ _id: auctionId });
  if (!dbAuction) {
    console.log(`Can't find Auction(id: ${auctionId}) in changeOwnership`);
  }

  // NFT Auction
  if (dbAuction.inventoryType === INVENTORY_TYPE.ASSET) {
    const dbAssetOldOwner = await assetModel.findOne({
      _id: dbAuction.inventoryId,
    });
    if (dbAssetOldOwner) {
      const dbCollection = await collectionModel.findOne({
        _id: dbAssetOldOwner.collectionId,
      });

      await _changeOwnership(
        dbAssetOldOwner,
        dbCollection,
        newOwner,
        dbAuction.assetQuantity,
      );
    }

    // Basket Auction
  } else if (dbAuction.inventoryType === INVENTORY_TYPE.BASKET) {
    const dbBasket = await basketModel.findOne({ _id: dbAuction.inventoryId });
    await dbBasket.updateOne({
      owner: newOwner,
      state: BASKET_STATES.DESTROYED,
    });
    console.log(
      `changed basket ownership of Basket(basketId: ${dbBasket._id})`,
      `to newOwner: ${newOwner}`,
    );

    for (let i = 0; i < dbBasket.assetIds.length; i++) {
      const dbAssetOldOwner = await assetModel.findOne({
        _id: dbBasket.assetIds[i],
      });
      const dbCollection = await collectionModel.findOne({
        _id: dbAssetOldOwner.collectionId,
      });

      await _changeOwnership(
        dbAssetOldOwner,
        dbCollection,
        newOwner,
        dbBasket.quantities[i],
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
        { _id: dbAssetOldOwner._id },
        { owner: newOwner },
      );

      console.log(
        `changed ERC721 ownership`,
        `of Asset(assetId: ${dbAssetOldOwner._id})`,
        `to newOwner: ${newOwner}`,
      );
      break;
    }

    // ERC1155
    case SUPPORTED_TOKEN_STANDARDS.ERC1155: {
      // Create asset entry for newOwner with assetQuantity from auction
      const nftContract = await NFTContractsModel.findOne({
        contractAddress: dbCollection.contractAddress,
      });
      const nftContractInstance = new web3.eth.Contract(
        JSON.parse(nftContract.abi),
        nftContract.contractAddress,
      );
      await createAssetHelper(
        dbAssetOldOwner.tokenId,
        auctionAssetQuantity,
        newOwner,
        dbAssetOldOwner.mintedBy,
        nftContractInstance,
        dbCollection,
      );

      // Decrease assetQuantity in oldOwner
      const updatedAssetQuantityOldOwner =
        parseInt(dbAssetOldOwner.quantity) - parseInt(auctionAssetQuantity);

      await assetModel.updateOne(
        { _id: dbAssetOldOwner._id },
        { quantity: updatedAssetQuantityOldOwner },
      );

      console.log(
        `Updated Old Owner Asset(assetId: ${dbAssetOldOwner._id})`,
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
        collectionId: dbCollection._id,
        tokenId: assetTokenId,
        owner: winner,
      });
      await transferAssetHistoryDbHelper(
        eventLog,
        dbAuction,
        dbAssetNewOwner._id,
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
    quantity: assetQuantity,
    basketId: dbBasket._id,
    actions: config.POLYGON_EXPLORER + '/' + eventLog.transactionHash,
  };

  await assetHistoryDbHelper(
    assetId,
    ASSET_HISTORY_EVENTS.BASKET_CREATE,
    assetHistoryParams,
  );
}

async function basketListAssetHistoryDbHelper(
  eventLog,
  dbBasket,
  assetId,
  assetQuantity,
  price,
) {
  const assetHistoryParams = {
    eventAt: dbBasket.updatedAt,
    price: price,
    to: dbBasket.basketOwner,
    quantity: assetQuantity,
    basketId: dbBasket._id,
    actions: config.POLYGON_EXPLORER + '/' + eventLog.transactionHash,
  };

  await assetHistoryDbHelper(
    assetId,
    ASSET_HISTORY_EVENTS.BASKET_LIST,
    assetHistoryParams,
  );
}

async function basketCancelListAssetHistoryDbHelper(
  eventLog,
  dbBasket,
  assetId,
  assetQuantity,
  price,
) {
  const assetHistoryParams = {
    eventAt: dbBasket.updatedAt,
    price: price,
    to: dbBasket.basketOwner,
    quantity: assetQuantity,
    basketId: dbBasket._id,
    actions: config.POLYGON_EXPLORER + '/' + eventLog.transactionHash,
  };

  await assetHistoryDbHelper(
    assetId,
    ASSET_HISTORY_EVENTS.BASKET_CANCEL_LIST,
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
    quantity: assetQuantity,
    basketId: dbBasket._id,
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
    quantity: assetQuantity,
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
    quantity: assetQuantity,
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
    quantity: assetQuantity,
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
    await dbAssetHistory.updateOne({
      $push: {
        history: [
          {
            event: assetHistoryType,
            ...assetHistoryParams,
          },
        ],
      },
    });
    await dbAssetHistory.save();
  } else {
    const history = {
      assetId: assetId,
      history: [
        {
          event: assetHistoryType,
          ...assetHistoryParams,
        },
      ],
    };
    const dbAssetHistoryNew = new assetHistoryModel(history);
    await dbAssetHistoryNew.save();
  }

  console.log(
    `### Event(${assetHistoryType}) added to asset history of`,
    `Asset(assetId: ${assetId})###`,
  );
}
async function getApiKey(network) {
  let apiKey;
  if (network === SUPPORTED_BLOCKCHAIN_NETWORK.POLYGON) {
    apiKey = config.NETWORK_CONFIG.POLYSCAN_API_KEY;
  }
  return apiKey;
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
  getApiKey,
};
