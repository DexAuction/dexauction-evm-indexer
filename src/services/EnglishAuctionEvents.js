const Web3 = require('web3');
const config = require('../config');
const web3 = new Web3(config.NETWORK_CONFIG.WS_NETWORK_URL);
const auctionModel = require('../models/auctions');
const lastSeenBlocksModel = require('../models/last_seen_blocks');
const seenTransactionModel = require('../models/seenTransaction');
const assetsModel = require('../models/assets');
const basketModel = require('../models/baskets');
const { ENGLISH_AUCTION_ABI, PROXY_AUCTION_ABI } = require('../abi');
const { AUCTION } = require('../constants');
const {
  listAssetHistoryHelper,
  changeOwnership,
  transferAssetHistoryHelper,
  cancelListAssetHistoryHelper,
} = require('../helper/utils');

const EnglishAuctionContract = new web3.eth.Contract(
  ENGLISH_AUCTION_ABI,
  config.NETWORK_CONFIG.ENGLISH_AUCTION_ADDRESS,
);
const ProxyContract = new web3.eth.Contract(
  PROXY_AUCTION_ABI,
  config.NETWORK_CONFIG.PROXY_ADDRESS,
);

const EnglishCreateAuctionEventSubscription = async function () {
  await updateLastSyncedBlock();

  let startTime;
  let endTime;

  // Subscribing to AuctionCreate English event
  await web3.eth.subscribe(
    'logs',
    {
      address: config.NETWORK_CONFIG.ENGLISH_AUCTION_ADDRESS.toLowerCase(),
    },

    async function (err, result) {
      if (
        !err &&
        result.address.toLowerCase() ===
          config.NETWORK_CONFIG.ENGLISH_AUCTION_ADDRESS.toLowerCase() &&
        result.topics[0] ===
          config.EVENT_TOPIC_SIGNATURES.ENGLISH_AUCTION_CREATE
      ) {
        console.log(`decoding ${ENGLISH_AUCTION_ABI[4]['name']} eventLogs`);
        const decodedData = web3.eth.abi.decodeLog(
          ENGLISH_AUCTION_ABI[4]['inputs'],
          result.data,
          result.topics.slice(1),
        );

        startTime = decodedData.startTime;
        endTime = decodedData.endTime;
      }
    },
  );

  // Subscribing to AuctionCreateProxy event
  await web3.eth.subscribe(
    'logs',
    {
      address: config.NETWORK_CONFIG.PROXY_ADDRESS.toLowerCase(),
    },

    async function (err, result) {
      if (
        !err &&
        result.address.toLowerCase() ===
          config.NETWORK_CONFIG.PROXY_ADDRESS.toLowerCase() &&
        result.topics[0] === config.EVENT_TOPIC_SIGNATURES.AUCTION_CREATE_PROXY
      ) {
        //check if transaction hash already exists

        const seenTx = await seenTransactionModel.findOne({
          transactionHash: result.transactionHash,
        });
        console.log('seenTx', seenTx);
        if (seenTx) {
          console.log('transaction already applied ');
          return;
        }

        console.log(`decoding ${PROXY_AUCTION_ABI[1]['name']} eventLogs`);
        const decodedData = web3.eth.abi.decodeLog(
          PROXY_AUCTION_ABI[1]['inputs'],
          result.data,
          result.topics.slice(1),
        );

        const auctionId = decodedData.auctionId;
        const auctionType = decodedData.auction_type;
        const auctionOwner = decodedData.auctionOwner;
        const assetTokenId = decodedData.tokenId;
        const tokenContractAddress = decodedData.tokenContractAddress;
        const assetQuantity = decodedData.quantity;

        //save in DB

        if (auctionType === AUCTION.ENGLISH_AUCTION) {
          _createAuction(
            result,
            auctionId,
            auctionOwner,
            auctionType,
            assetTokenId,
            assetQuantity,
            tokenContractAddress,
            startTime,
            endTime,
          );
          console.log('syncedblock create', config.LAST_SYNCED_BLOCK);
        }
      }
    },
  );

  // Subscribing to BasketAuctionCreateProxy event
  await web3.eth.subscribe(
    'logs',
    {
      address: config.NETWORK_CONFIG.PROXY_ADDRESS.toLowerCase(),
    },

    async function (err, result) {
      if (
        !err &&
        result.address.toLowerCase() ===
          config.NETWORK_CONFIG.PROXY_ADDRESS.toLowerCase() &&
        result.topics[0] ===
          config.EVENT_TOPIC_SIGNATURES.BASKET_AUCTION_CREATE_PROXY
      ) {
        console.log('Result basket auction ', result);

        //check if transaction hash already exists

        const seenTx = await seenTransactionModel.findOne({
          transactionHash: result.transactionHash,
        });
        console.log('seenTx', seenTx);
        if (seenTx) {
          console.log('transaction already applied ');
          return;
        }

        console.log(`decoding ${PROXY_AUCTION_ABI[3]['name']} eventLogs`);
        const decodedData = web3.eth.abi.decodeLog(
          PROXY_AUCTION_ABI[3]['inputs'],
          result.data,
          result.topics.slice(1),
        );

        const auctionId = decodedData.auctionId;
        const auctionType = decodedData.auction_type;
        const auctionOwner = decodedData.auctionOwner;
        const basketId = decodedData.basketId;

        //save in DB

        if (auctionType == 'english') {
          _createBasketAuction(
            result,
            auctionId,
            auctionOwner,
            auctionType,
            basketId,
            startTime,
            endTime,
          );
          console.log('syncedblock create', config.LAST_SYNCED_BLOCK);
        }
      }
    },
  );

  // function heartbeat() {
  //   if (!subscribingTransfer || !subscribingTransfer.id) {
  //     return;
  //   }
  //   subscribingTransfer.subscribe(subscribingTransfer.callback);
  //   setTimeout(heartbeat, 10000);
  // }

  // heartbeat();
};

const EnglishConfigureAuctionEventSubscription = async function () {
  await updateLastSyncedBlock();

  // Subscribing to AuctionConfigure Engligh event
  await web3.eth.subscribe(
    'logs',
    {
      address: config.NETWORK_CONFIG.ENGLISH_AUCTION_ADDRESS.toLowerCase(),
    },
    async function (err, result) {
      if (
        !err &&
        result.address.toLowerCase() ===
          config.NETWORK_CONFIG.ENGLISH_AUCTION_ADDRESS.toLowerCase() &&
        result.topics[0] ===
          config.EVENT_TOPIC_SIGNATURES.ENGLISH_CONFIGURE_AUCTION
      ) {
        console.log('result Configure ', result);
        const seenTx = await seenTransactionModel.findOne({
          transactionHash: result.transactionHash,
        });
        if (seenTx) {
          console.log(
            `transaction already applied with transaction hash ${result.transactionHash}`,
          );
          return;
        }

        console.log(`decoding ${ENGLISH_AUCTION_ABI[3]['name']} eventLogs`);
        const decodedData = web3.eth.abi.decodeLog(
          ENGLISH_AUCTION_ABI[3]['inputs'],
          result.data,
          result.topics.slice(1),
        );

        const auctionId = decodedData.auctionID;
        const startTime = decodedData.startTime;
        const endTime = decodedData.endTime;
        const softCloseDuration = decodedData.softCloseDuration;
        const openingPrice = decodedData.openingPrice;
        const buyOutPrice = decodedData.buyOutPrice;
        const minIncrement = decodedData.minIncrement;

        _configureAuction(
          result,
          auctionId,
          openingPrice,
          startTime,
          endTime,
          minIncrement,
          softCloseDuration,
          buyOutPrice,
        );
        console.log('syncedBlock configure', config.LAST_SYNCED_BLOCK);
      }
    },
  );
};

const EnglishPlaceBidEventSubscription = async function () {
  await updateLastSyncedBlock();

  // Subscribing to PlaceBid event
  await web3.eth.subscribe(
    'logs',
    {
      address: config.NETWORK_CONFIG.ENGLISH_AUCTION_ADDRESS.toLowerCase(),
    },
    async function (err, result) {
      if (
        !err &&
        result.address.toLowerCase() ===
          config.NETWORK_CONFIG.ENGLISH_AUCTION_ADDRESS.toLowerCase() &&
        result.topics[0] === config.EVENT_TOPIC_SIGNATURES.ENGLISH_PLACE_BID
      ) {
        console.log('result Bid ', result);
        const seenTx = await seenTransactionModel.findOne({
          transactionHash: result.transactionHash,
        });
        if (seenTx) {
          console.log(
            `transaction already applied with transaction hash ${result.transactionHash}`,
          );
          return;
        }

        console.log(`decoding ${ENGLISH_AUCTION_ABI[7]['name']} eventLogs`);
        const decodedData = web3.eth.abi.decodeLog(
          ENGLISH_AUCTION_ABI[7]['inputs'],
          result.data,
          result.topics.slice(1),
        );
        const auctionId = decodedData.auctionID;
        const bidder = decodedData.winner;
        const bid = decodedData.bid;

        await _placeBid(result, auctionId, bidder, bid);
        console.log('syncedBlock bid', config.LAST_SYNCED_BLOCK);
      }
    },
  );
};

// const EnglishAuctionEndEventSubscription = async function () {
//   await updateLastSyncedBlock();

//   // Subscribing to AuctionEnd event
//   await web3.eth.subscribe(
//     'logs',
//     {
//       address: config.NETWORK_CONFIG.PROXY_ADDRESS.toLowerCase(),
//     },
//     async function (err, result) {
//       if (
//         !err &&
//         result.address.toLowerCase() ===
//           config.NETWORK_CONFIG.PROXY_ADDRESS.toLowerCase() &&
//         result.topics[0] === config.EVENT_TOPIC_SIGNATURES.ENGLISH_AUCTION_END
//       ) {
//         console.log('result end auction ', result);

//         console.log(`decoding ${ENGLISH_AUCTION_ABI[5]['name']} eventLogs`);
//         const decodedData = web3.eth.abi.decodeLog(
//           ENGLISH_AUCTION_ABI[5]['inputs'],
//           result.data,
//           result.topics.slice(1)
//         );
//         const auctionId = decodedData.auctionID;
//         const winner = decodedData.owner;
//         const winningBid = decodedData.winningBid;

//         console.log('syncedBlock End ', config.LAST_SYNCED_BLOCK);
//       }
//     },
//   );
// };

const EnglishAuctionCancelEventSubscription = async function () {
  await updateLastSyncedBlock();

  // Subscribing to AuctionCancel event
  await web3.eth.subscribe(
    'logs',
    {
      address: config.NETWORK_CONFIG.ENGLISH_AUCTION_ADDRESS.toLowerCase(),
    },
    async function (err, result) {
      if (
        !err &&
        result.address.toLowerCase() ===
          config.NETWORK_CONFIG.ENGLISH_AUCTION_ADDRESS.toLowerCase() &&
        result.topics[0] ===
          config.EVENT_TOPIC_SIGNATURES.ENGLISH_AUCTION_CANCEL
      ) {
        console.log('result cancel auction ', result);
        const seenTx = await seenTransactionModel.findOne({
          transactionHash: result.transactionHash,
        });
        if (seenTx) {
          console.log(
            `transaction already applied with transaction hash ${result.transactionHash}`,
          );
          return;
        }

        console.log(`decoding ${ENGLISH_AUCTION_ABI[1]['name']} eventLogs`);
        const decodedData = web3.eth.abi.decodeLog(
          ENGLISH_AUCTION_ABI[1]['inputs'],
          result.data,
          result.topics.slice(1),
        );
        const auctionId = decodedData.auctionID;

        await _cancelAuction(result, auctionId);
        console.log('syncedBlock Cancel 1', config.LAST_SYNCED_BLOCK);
      }
    },
  );
};

const EnglishAuctionCompleteEventSubscription = async function () {
  await updateLastSyncedBlock();

  // Subscribing to AuctionComplete event
  await web3.eth.subscribe(
    'logs',
    {
      address: config.NETWORK_CONFIG.ENGLISH_AUCTION_ADDRESS.toLowerCase(),
    },
    async function (err, result) {
      if (
        !err &&
        result.address.toLowerCase() ===
          config.NETWORK_CONFIG.ENGLISH_AUCTION_ADDRESS.toLowerCase() &&
        result.topics[0] ===
          config.EVENT_TOPIC_SIGNATURES.ENGLISH_AUCTION_COMPLETE
      ) {
        console.log('result complete Auction ', result);

        const seenTx = await seenTransactionModel.findOne({
          transactionHash: result.transactionHash,
        });

        if (seenTx) {
          console.log(
            `transaction already applied with transaction hash ${result.transactionHash}`,
          );
          return;
        }

        console.log(`decoding ${ENGLISH_AUCTION_ABI[2]['name']} eventLogs`);
        const decodedData = web3.eth.abi.decodeLog(
          ENGLISH_AUCTION_ABI[2]['inputs'],
          result.data,
          result.topics.slice(1),
        );
        const auctionId = decodedData.auctionID;
        const winner = decodedData.winner;
        const winningBid = decodedData.winningBid;

        await _auctionComplete(result, auctionId, winningBid, winner);
        console.log('syncedBlock complete ', config.LAST_SYNCED_BLOCK);
      }
    },
  );
};

async function updateLastSyncedBlock() {
  await web3.eth.subscribe('newBlockHeaders', async function (err, result) {
    if (!err) {
      console.log('result.number ', result.number);
      config.LAST_SYNCED_BLOCK = result.number;
    }
  });
  return config.LAST_SYNCED_BLOCK;
}

let processing = false;
let initialised = false;

const scrapeEnglishAuctionEventLogs = async function () {
  try {
    if (processing || !initialised) {
      return;
    }
    processing = true;
    console.log('Scraping english contract event logs ...');
    const lastSeenBlockRes = await lastSeenBlocksModel.findOne();

    const lastSeenBlock = lastSeenBlockRes.blockNumberEnglish;

    // Start from block next to the last seen block till the (latestBlock - CONFIRMATION_COUNT)
    const fromBlock = parseInt(lastSeenBlock) + 1 + '';
    const latestBlockNumber = await web3.eth.getBlockNumber();
    let toBlock;
    if (latestBlockNumber > config.CONFIRMATION_COUNT) {
      toBlock = latestBlockNumber - config.CONFIRMATION_COUNT + '';
    } else {
      toBlock = fromBlock;
    }

    if (fromBlock <= toBlock) {
      const allEventLogs = await EnglishAuctionContract.getPastEvents(
        'allEvents',
        {
          fromBlock,
          toBlock,
        },
      );

      const allEventLogsProxy = await ProxyContract.getPastEvents('allEvents', {
        fromBlock,
        toBlock,
      });
      console.log('allEventLogsProxy English', allEventLogsProxy);
      console.log('allEventLogs', allEventLogs);
      let promises = [];
      for (element of allEventLogs) {
        const seenTx = await seenTransactionModel.findOne({
          transactionHash: element.transactionHash,
        });
        if (seenTx) {
          console.log(
            `transaction already applied with tx hash ${element.transactionHash}`,
          );
          continue;
        }
        switch (element.event) {
          case 'AuctionCreate': {
            for (item of allEventLogsProxy) {
              if (
                item.event === 'AuctionCreateProxy' &&
                item.returnValues.auction_type === AUCTION.ENGLISH_AUCTION &&
                item.transactionHash === element.transactionHash
              ) {
                const auctionId = item.returnValues.auctionId;
                const auctionType = item.returnValues.auction_type;
                const auctionOwner = item.returnValues.auctionOwner;
                const assetTokenId = item.returnValues.tokenId;
                const tokenContractAddress =
                  item.returnValues.tokenContractAddress;
                const assetQuantity = item.returnValues.quantity;
                promises.push(
                  _createAuction(
                    element,
                    auctionId,
                    auctionOwner,
                    auctionType,
                    assetTokenId,
                    assetQuantity,
                    tokenContractAddress,
                    element.returnValues.startTime,
                    element.returnValues.endTime,
                  ),
                );
              } else if (
                item.event === 'BasketAuctionCreateProxy' &&
                item.returnValues.auction_type === AUCTION.ENGLISH_AUCTION &&
                item.transactionHash === element.transactionHash
              ) {
                const auctionId = item.returnValues.auctionId;
                const auctionType = item.returnValues.auction_type;
                const auctionOwner = item.returnValues.auctionOwner;
                const basketId = item.returnValues.basketId;
                promises.push(
                  _createBasketAuction(
                    element,
                    auctionId,
                    auctionOwner,
                    auctionType,
                    basketId,
                    element.returnValues.startTime,
                    element.returnValues.endTime,
                  ),
                );
              }
            }

            break;
          }
          case 'AuctionConfigure': {
            const openingPrice = element.returnValues.openingPrice;
            const minIncrement = element.returnValues.minIncrement;
            const startTimestamp = element.returnValues.startTime;
            const endTimestamp = element.returnValues.endTime;
            const buyOutPrice = element.returnValues.buyOutPrice;
            const softCloseDuration = element.returnValues.softCloseDuration;
            const auctionId = element.returnValues.auctionID;
            promises.push(
              _configureAuction(
                element,
                auctionId,
                openingPrice,
                startTimestamp,
                endTimestamp,
                minIncrement,
                softCloseDuration,
                buyOutPrice,
              ),
            );
            break;
          }
          case 'PlaceBid': {
            const auctionId = element.returnValues.auctionID;
            const bid = element.returnValues.bid;
            const bidder = element.returnValues.winner;
            promises.push(_placeBid(element, auctionId, bidder, bid));
            break;
          }
          case 'AuctionComplete': {
            const auctionId = element.returnValues.auctionID;
            const winningBid = element.returnValues.winningBid;
            const winner = element.returnValues.winner;

            promises.push(
              _auctionComplete(element, auctionId, winningBid, winner),
            );
            break;
          }
          case 'AuctionCancel': {
            const auctionId = element.returnValues.auctionID;
            promises.push(_cancelAuction(element, auctionId));
            break;
          }
          default:
            break;
        }
      }
      await Promise.all(promises);
    }
    const resp = await lastSeenBlocksModel.findOneAndUpdate(
      {},
      { blockNumberEnglish: toBlock },
      { new: true },
    );
    await resp.save();
  } catch (error) {
    console.error(error);
  } finally {
    processing = false;
  }
};

// Initialize Scraping English Auction Event Logs
const initScrapeEnglishAuctionEventLogs = async function (lastSeenBlockRes) {
  try {
    console.log('Initializing English contract event logs ...');

    const lastSeenBlock = lastSeenBlockRes.blockNumberEnglish;

    // Start from block next to the last seen block till the (latestBlock - CONFIRMATION_COUNT)
    const fromBlock = parseInt(lastSeenBlock) + 1 + '';
    const latestBlockNumber = await web3.eth.getBlockNumber();

    let toBlock;

    if (latestBlockNumber > config.CONFIRMATION_COUNT) {
      toBlock = latestBlockNumber - config.CONFIRMATION_COUNT + '';
    } else {
      toBlock = fromBlock;
    }
    if (fromBlock <= toBlock) {
      const allEventLogs = await EnglishAuctionContract.getPastEvents(
        'allEvents',
        {
          fromBlock,
          toBlock,
        },
      );

      const allEventLogsProxy = await ProxyContract.getPastEvents('allEvents', {
        fromBlock,
        toBlock,
      });
      console.log('allEventLogsProxy English Init', allEventLogsProxy);
      console.log('allEventLogs Init', allEventLogs);

      for (element of allEventLogs) {
        const seenTx = await seenTransactionModel.findOne({
          transactionHash: element.transactionHash,
        });
        if (seenTx) {
          console.log(
            `transaction already applied with tx hash ${element.transactionHash}`,
          );
          continue;
        }
        switch (element.event) {
          case 'AuctionCreate': {
            for (item of allEventLogsProxy) {
              if (
                item.event === 'AuctionCreateProxy' &&
                item.returnValues.auction_type === AUCTION.ENGLISH_AUCTION &&
                item.transactionHash === element.transactionHash
              ) {
                const auctionId = item.returnValues.auctionId;
                const auctionType = item.returnValues.auction_type;
                const auctionOwner = item.returnValues.auctionOwner;
                const assetTokenId = item.returnValues.tokenId;
                const tokenContractAddress =
                  item.returnValues.tokenContractAddress;
                const assetQuantity = item.returnValues.quantity;
                await _createAuction(
                  element,
                  auctionId,
                  auctionOwner,
                  auctionType,
                  assetTokenId,
                  assetQuantity,
                  tokenContractAddress,
                  element.returnValues.startTime,
                  element.returnValues.endTime,
                );
              } else if (
                item.event === 'BasketAuctionCreateProxy' &&
                item.returnValues.auction_type === AUCTION.ENGLISH_AUCTION &&
                item.transactionHash === element.transactionHash
              ) {
                const auctionId = item.returnValues.auctionId;
                const auctionType = item.returnValues.auction_type;
                const auctionOwner = item.returnValues.auctionOwner;
                const basketId = item.returnValues.basketId;
                await _createBasketAuction(
                  element,
                  auctionId,
                  auctionOwner,
                  auctionType,
                  basketId,
                  element.returnValues.startTime,
                  element.returnValues.endTime,
                );
              }
            }

            break;
          }
          case 'AuctionConfigure': {
            const openingPrice = element.returnValues.openingPrice;
            const minIncrement = element.returnValues.minIncrement;
            const startTimestamp = element.returnValues.startTime;
            const endTimestamp = element.returnValues.endTime;
            const buyOutPrice = element.returnValues.buyOutPrice;
            const softCloseDuration = element.returnValues.softCloseDuration;
            const auctionId = element.returnValues.auctionID;
            await _configureAuction(
              element,
              auctionId,
              openingPrice,
              startTimestamp,
              endTimestamp,
              minIncrement,
              softCloseDuration,
              buyOutPrice,
            );
            break;
          }
          case 'PlaceBid': {
            const auctionId = element.returnValues.auctionID;
            const bid = element.returnValues.bid;
            const bidder = element.returnValues.winner;

            await _placeBid(element, auctionId, bidder, bid);
            break;
          }
          case 'AuctionComplete': {
            const auctionId = element.returnValues.auctionID;
            const winningBid = element.returnValues.winningBid;
            const winner = element.returnValues.winner;

            await _auctionComplete(element, auctionId, winningBid, winner);
            break;
          }
          case 'AuctionCancel': {
            const auctionId = element.returnValues.auctionID;
            await _cancelAuction(element, auctionId);
            break;
          }
          default:
            break;
        }
      }
    }
    const resp = await lastSeenBlocksModel.findOneAndUpdate(
      {},
      { blockNumberEnglish: toBlock },
      { new: true },
    );
    await resp.save();
    initialised = true;
  } catch (error) {
    console.error(error);
  }
};

async function _createAuction(
  eventLog,
  auctionId,
  auctionOwner,
  auctiontype,
  assetTokenId,
  assetQuantity,
  tokenContractAddress,
  startTime,
  endTime,
) {
  const getAuction = await auctionModel.findOne({
    auctionId: auctionId,
  });

  if (getAuction) {
    console.log('Auction Id already exists');
    return;
  }

  const getAsset = await assetsModel.findOne({
    assetContractAddress: tokenContractAddress,
    assetTokenId: assetTokenId,
    owner: auctionOwner,
  });

  console.log('### Create English Auction ###');
  const dbAuction = new auctionModel({
    auctionId: auctionId,
    assetId: getAsset.assetId,
    fk_assetId: getAsset._id,
    assetTokenId: assetTokenId,
    assetQuantity: assetQuantity,
    tokenContract: tokenContractAddress,
    seller: auctionOwner,
    state: 'NOT-STARTED',
    auctionType: auctiontype,
    englishAuctionAttribute: {
      opening_price: 0,
      min_increment: 0,
      start_timestamp: startTime * 1000,
      end_timestamp: endTime * 1000,
      start_datetime: new Date(startTime * 1000),
      end_datetime: new Date(endTime * 1000),
      soft_close_duration: 0,
      buyout_price: 0,
      winning_bid: 0,
    },
  });
  await dbAuction.save();

  const seentx = new seenTransactionModel({
    transactionHash: eventLog.transactionHash,
    blockNumber: eventLog.blockNumber,
    eventLog: eventLog,
    state: 'APPLIED',
  });
  await seentx.save();
}

async function _createBasketAuction(
  eventLog,
  auctionId,
  auctionOwner,
  auctionType,
  basketId,
  startTime,
  endTime,
) {
  const getBasket = await basketModel.findOne({
    basketId: basketId,
  });

  if (getBasket) {
    console.log(' ### Create English Basket Auction ### ');

    const dbAuction = new auctionModel({
      auctionId: auctionId,
      seller: auctionOwner,
      state: 'NOT-STARTED',
      auctionType: auctionType,
      basketId: basketId,
      fk_basketId: getBasket._id,
      englishAuctionAttribute: {
        opening_price: 0,
        min_increment: 0,
        start_timestamp: startTime * 1000,
        end_timestamp: endTime * 1000,
        start_datetime: new Date(startTime * 1000),
        end_datetime: new Date(endTime * 1000),
        soft_close_duration: 0,
        buyout_price: 0,
        winning_bid: 0,
      },
    });
    await dbAuction.save();
  }

  const seentx = new seenTransactionModel({
    transactionHash: eventLog.transactionHash,
    blockNumber: eventLog.blockNumber,
    eventLog: eventLog,
    state: 'APPLIED',
  });
  await seentx.save();
}

async function _configureAuction(
  eventLog,
  auctionId,
  openingPrice,
  startTimestamp,
  endTimestamp,
  minIncrement,
  softCloseDuration,
  buyOutPrice,
) {
  await auctionModel.updateOne(
    { auctionId: auctionId },
    {
      englishAuctionAttribute: {
        opening_price: openingPrice,
        min_increment: minIncrement,
        start_timestamp: startTimestamp * 1000,
        end_timestamp: endTimestamp * 1000,
        start_datetime: new Date(startTimestamp * 1000),
        end_datetime: new Date(endTimestamp * 1000),
        soft_close_duration: softCloseDuration,
        buyout_price: buyOutPrice,
        winning_bid: 0,
      },
      state: 'ONGOING',
    },
  );
  await listAssetHistoryHelper(eventLog, auctionId, AUCTION.ENGLISH_AUCTION);

  const seentxConfigure = new seenTransactionModel({
    transactionHash: eventLog.transactionHash,
    blockNumber: eventLog.blockNumber,
    eventLog: eventLog,
    state: 'APPLIED',
  });
  await seentxConfigure.save();
}

async function _placeBid(eventLog, auctionId, bidder, bid) {
  await auctionModel.updateOne(
    { auctionId: auctionId },
    {
      $push: {
        'englishAuctionAttribute.bids': [
          {
            address: bidder,
            bid: bid,
            bid_timestamp: new Date().toISOString(),
            txHash: eventLog.transactionHash,
          },
        ],
        bidders: bidder,
      },
    },
  );
  const seentxBid = new seenTransactionModel({
    transactionHash: eventLog.transactionHash,
    blockNumber: eventLog.blockNumber,
    eventLog: eventLog,
    state: 'APPLIED',
  });
  await seentxBid.save();
}

async function _auctionComplete(eventLog, auctionId, winningBid, winner) {
  await auctionModel.updateOne(
    { auctionId: auctionId },
    {
      $set: {
        'englishAuctionAttribute.winning_bid': winningBid,
      },
      buyer: winner,
      state: 'SUCCESSFULLY-COMPLETED',
    },
  );

  //change owner in asset schema
  await changeOwnership(auctionId, winner);

  //make entry in asset history
  await transferAssetHistoryHelper(eventLog, auctionId, winningBid, winner);

  const seentxComplete = new seenTransactionModel({
    transactionHash: eventLog.transactionHash,
    blockNumber: eventLog.blockNumber,
    eventLog: eventLog,
    state: 'APPLIED',
  });
  await seentxComplete.save();
}

async function _cancelAuction(eventLog, auctionId) {
  await auctionModel.updateOne(
    { auctionId: auctionId },
    {
      state: 'CANCELLED',
      $set: { 'englishAuctionAttribute.winning_bid': 0 },
    },
  );

  //make entry in asset history
  await cancelListAssetHistoryHelper(
    eventLog,
    auctionId,
    AUCTION.ENGLISH_AUCTION,
  );

  const seentxCancel = new seenTransactionModel({
    transactionHash: eventLog.transactionHash,
    blockNumber: eventLog.blockNumber,
    eventLog: eventLog,
    state: 'APPLIED',
  });
  await seentxCancel.save();
}
module.exports = {
  EnglishCreateAuctionEventSubscription,
  EnglishConfigureAuctionEventSubscription,
  EnglishPlaceBidEventSubscription,
  EnglishAuctionCancelEventSubscription,
  // EnglishAuctionEndEventSubscription,
  EnglishAuctionCompleteEventSubscription,
  scrapeEnglishAuctionEventLogs,
  initScrapeEnglishAuctionEventLogs,
};
