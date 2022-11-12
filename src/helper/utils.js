const axios = require('axios');
const { DEFAULT_ASSET_STATUS, MINT, LIST, TRANSFER, CANCEL_LIST, AUCTION} = require('../constants');
const config = require('../config');
const assetHistoryModel = require('../models/history_assets');
const basketModel = require("../models/baskets");
const auctionModel = require('../models/auctions');
const collectionModel = require("../models/collections");
const assetModel = require('../models/assets');
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

async function createBasketHelper(eventlog,basketId,nftContracts,tokenIds,quantites){
try{
  const getBasket = await basketModel.findOne({
    basketId: basketId,
  });

  if(getBasket){
      throw("Basket Id already exists");
  }
  
  else{
    let collectionIds = [];
    let fk_collectionIds = [];
    let assetIds = [];
    let fk_assetsIds = [];
    for(let i=0;i<nftContracts.length;i++){
      const getCollection = await collectionModel.findOne({contractAddress: nftContracts[i]});
        collectionIds.push(getCollection.collectionId);
        fk_collectionIds.push(getCollection._id);
         const getAsset = await assetModel.findOne({assetContractAddress: nftContracts[i], assetTokenId:tokenIds[i]});
         assetIds.push(getAsset.assetId);
         fk_assetsIds.push(getAsset._id);
    }
    const dbBasket = {
      basketId: basketId,
      contractAddresses: nftContracts,
      assetTokenIds: tokenIds,
      quantities: quantites,
      collectionIds: collectionIds,
      fk_collectionIds: fk_collectionIds,
      assetIds:assetIds,
      fk_assetIds: fk_assetsIds
    }
    const basketCreate = new basketModel(dbBasket);
    await basketCreate.save();
  }
} catch (err) {
  console.error(err);
}
}
async function listAssetHistoryHelper(auctionId,auctionType,element){
  const dbAuction = await auctionModel.findOne({ auctionId: auctionId });
  let priceVal ;
      if(auctionType === AUCTION.DUTCH_AUCTION){
        priceVal = dbAuction.dutchAuctionAttribute.opening_price;
      }
      else if(auctionType === AUCTION.ENGLISH_AUCTION){
        priceVal = dbAuction.englishAuctionAttribute.opening_price;
      }
  if(dbAuction.assetId){
    const dbAsset = await assetModel.findById(dbAuction.fk_assetId);
    const dbAssetHistory = await assetHistoryModel.findOne({
      assetId: dbAsset.assetId,
    });
    if (dbAssetHistory) {
      
      await dbAssetHistory.update({
        $push: {
          history: [
            {
              event: LIST,
              event_date: dbAuction.createdAt.toLocaleDateString(),
              event_time: dbAuction.createdAt.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              }),
              price: priceVal,
              from: dbAuction.seller,
              actions: config.POLYGON_EXPLORER + '/' + element.transactionHash,
            },
          ],
        },
      });
      console.log(`### List ${auctionType} Auction Asset history ###`);
    } else {
      console.log('asset not minted yet..', dbAsset.assetId);
    }
    await dbAssetHistory.save();
  }
  else if(dbAuction.basketId){

    const dbBasket = await basketModel.findOne({auctionId:auctionId});

    for(item of dbBasket.assetIds){
      const dbAssetHistory = await assetHistoryModel.findOne({
        assetId: item,
      });
      if (dbAssetHistory) {
        await dbAssetHistory.update({
          $push: {
            history: [
              {
                event: LIST,
                event_date: dbAuction.createdAt.toLocaleDateString(),
                event_time: dbAuction.createdAt.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                }),
                price: priceVal,
                from: dbAuction.seller,
                actions: config.POLYGON_EXPLORER + '/' + element.transactionHash,
              },
            ],
          },
        });
        console.log(`### List ${auctionType} Basket Auction Asset history  ###`);
      } else {
        console.log('asset not minted yet..', item);
      }
      await dbAssetHistory.save();
    }
  }

}


async function transferAssetHistoryHelper(auctionId,auctionType,element,winningBid,winner){

  const dbAuction = await auctionModel.findOne({ auctionId: auctionId });
  if(dbAuction.assetId){
    const dbAsset = await assetModel.findById(dbAuction.fk_assetId);
    const dbAssetHistory = await assetHistoryModel.findOne({
      assetId: dbAsset.assetId,
    });
    if (dbAssetHistory) {
      
      await dbAssetHistory.update({
        $push: {
          history: [
            {
              event: TRANSFER,
              event_date: dbAuction.createdAt.toLocaleDateString(),
              event_time: dbAuction.createdAt.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              }),
              price: winningBid,
              from: dbAuction.seller,
              to: winner,
              actions: config.POLYGON_EXPLORER + '/' + element.transactionHash,
            },
          ],
        },
      });
      console.log(`### Transfer ${auctionType} Auction Asset history ###`);
    } else {
      console.log('asset not minted yet..', dbAsset.assetId);
    }
    await dbAssetHistory.save();
  }
  else if(dbAuction.basketId){

    const dbBasket = await basketModel.findOne({auctionId:auctionId});

    for(item of dbBasket.assetIds){
      const dbAssetHistory = await assetHistoryModel.findOne({
        assetId: item,
      });
      if (dbAssetHistory) {
        await dbAssetHistory.update({
          $push: {
            history: [
              {
                event: TRANSFER,
                event_date: dbAuction.createdAt.toLocaleDateString(),
                event_time: dbAuction.createdAt.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                }),
                price: winningBid,
                from: dbAuction.seller,
                to: winner,
                actions: config.POLYGON_EXPLORER + '/' + element.transactionHash,
              },
            ],
          },
        });
        console.log(`### Transfer ${auctionType} Basket Auction Asset history ###`);
      } else {
        console.log('asset not minted yet..', item);
      }
      await dbAssetHistory.save();
    }
  }

}

async function cancelListAssetHistoryHelper(auctionId,auctionType,element){
  const dbAuction = await auctionModel.findOne({ auctionId: auctionId });
  let priceVal ;
      if(auctionType === AUCTION.DUTCH_AUCTION){
        priceVal = dbAuction.dutchAuctionAttribute.opening_price;
      }
      else if(auctionType === AUCTION.ENGLISH_AUCTION){
        priceVal = dbAuction.englishAuctionAttribute.opening_price;
      }
  if(dbAuction.assetId){
    const dbAsset = await assetModel.findById(dbAuction.fk_assetId);

    const dbAssetHistory = await assetHistoryModel.findOne({
      assetId: dbAsset.assetId,
    });
    if (dbAssetHistory) {
      await dbAssetHistory.update({
        $push: {
          history: [
            {
              event: CANCEL_LIST,
              event_date: dbAuction.createdAt.toLocaleDateString(),
              event_time: dbAuction.createdAt.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              }),
              price: priceVal,
              from: dbAuction.seller,
              actions: config.POLYGON_EXPLORER + '/' + element.transactionHash,
            },
          ],
        },
      });
      console.log(
        `### Cancel List ${auctionType} Auction Asset history ###`
      );
    } else {
      console.log('asset not minted yet..', dbAsset.assetId);
    }
    await dbAssetHistory.save();
  }
  else if(dbAuction.basketId){

    const dbBasket = await basketModel.findOne({auctionId:auctionId});
       for(item of dbBasket.assetIds){
         const dbAssetHistory = await assetHistoryModel.findOne({
           assetId: item,
         });
         if (dbAssetHistory) {
           await dbAssetHistory.update({
             $push: {
               history: [
                 {
                   event: CANCEL_LIST,
                   event_date: dbAuction.createdAt.toLocaleDateString(),
                   event_time: dbAuction.createdAt.toLocaleTimeString([], {
                     hour: '2-digit',
                     minute: '2-digit',
                   }),
                   price: dbAuction.dutchAuctionAttribute.opening_price,
                   from: dbAuction.seller,
                   actions: config.POLYGON_EXPLORER + '/' + element.transactionHash,
                 },
               ],
             },
           });
           console.log(`### Cancel List ${auctionType} Basket Auction Asset history ###`);
         } else {
           console.log('asset not minted yet..', item);
         }
         await dbAssetHistory.save();
       }
 }

}

async function changeOwnership(auctionId,newOwner){
  const dbAuction = await auctionModel.findOne({ auctionId: auctionId });
        if(dbAuction.assetId){
          const dbAsset = await assetModel.findById(dbAuction.fk_assetId);
              if(dbAsset){
                await assetModel.updateOne(
                  { assetId: dbAsset.assetId },
                  { owner: newOwner },
                );
              
        }
      }
      else if(dbAuction.basketId){
        const dbBasket = await basketModel.findOne({auctionId:auctionId});
        for(item of dbBasket.assetIds){
            await assetModel.updateOne(
              { assetId: item },
              { owner: newOwner },
            );   
        }
      }
}
module.exports = {
  createAssetHelper,
  createBasketHelper,
  listAssetHistoryHelper,
  transferAssetHistoryHelper,
  cancelListAssetHistoryHelper,
  changeOwnership
};
