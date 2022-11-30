const Web3 = require('web3');
const config = require('../config');
const web3 = new Web3(config.NETWORK_CONFIG.WS_NETWORK_URL);
const auctionModel = require('../models/auctions');
const assetsModel = require('../models/assets');
const lastSeenBlocksModel = require('../models/last_seen_blocks');
const basketModel = require('../models/baskets');
const seenTransactionModel = require('../models/seen_transaction');
const { DUTCH_CONTRACT_ABI, PROXY_AUCTION_ABI } = require('../abi');
const { AUCTION, BASKET_STATES } = require('../constants');
const {
  listAssetHistoryHelper,
  transferAssetHistoryHelper,
  cancelListAssetHistoryHelper,
  changeOwnership,
} = require('../helper/utils');

const DutchAuctionContract = new web3.eth.Contract(
  DUTCH_CONTRACT_ABI,
  config.NETWORK_CONFIG.DUTCH_CONTRACT_ADDRESS,
);
const ProxyContract = new web3.eth.Contract(
  PROXY_AUCTION_ABI,
  config.NETWORK_CONFIG.PROXY_ADDRESS,
);

const DutchCreateAuctionEventSubscription = async function () {
  await updateLastSyncedBlock();

  let startTime;
  // Subscribing AuctionCreate event
  await web3.eth.subscribe(
    'logs',
    {
      address: config.NETWORK_CONFIG.DUTCH_CONTRACT_ADDRESS.toLowerCase(),
    },

    async function (err, result) {
      if (
        !err &&
        result.address.toLowerCase() ===
          config.NETWORK_CONFIG.DUTCH_CONTRACT_ADDRESS.toLowerCase() &&
        result.topics[0] === config.EVENT_TOPIC_SIGNATURES.DUTCH_AUCTION_CREATE
      ) {
        console.log('result 1', result);
        console.log(
          `decoding ${DUTCH_CONTRACT_ABI[3]['name']} eventLogs in DutchAuctionEvents`,
        );
        const decodedData = web3.eth.abi.decodeLog(
          DUTCH_CONTRACT_ABI[3]['inputs'],
          result.data,
          result.topics.slice(1),
        );

        startTime = decodedData.startTime;
      }
    },
  );

  // Subscribing AuctionCreateProxy event
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
        const seenTx = await seenTransactionModel.findOne({
          transactionHash: result.transactionHash,
        });
        if (seenTx) {
          console.log(
            `transaction already applied , Transaction hash: ${result.transactionHash}`,
          );
          return;
        }

        console.log(
          `decoding ${PROXY_AUCTION_ABI[1]['name']} eventLogs in DutchAuctionEvents`,
        );
        const decodedData = web3.eth.abi.decodeLog(
          PROXY_AUCTION_ABI[1]['inputs'],
          result.data,
          result.topics.slice(1),
        );

        const auctionId = decodedData.auctionId;
        const auctionType = decodedData.auction_type;
        const auctionOwner = decodedData.auctionOwner;
        const assetTokenId = decodedData.tokenId;
        const assetQuantity = decodedData.quantity;
        const tokenContractAddress = decodedData.tokenContractAddress;

        if (auctionType === AUCTION.DUTCH) {
          //save in DB
          _createAuction(
            result,
            auctionId,
            auctionOwner,
            auctionType,
            assetTokenId,
            assetQuantity,
            tokenContractAddress,
            startTime,
          );

          console.log('syncedblock create Dutch', config.LAST_SYNCED_BLOCK);
        }
      }
    },
  );

  // Subscribing BasketAuctionCreateProxy event
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
        console.log('Result basket auction from Dutch ', result);

        //check if transaction hash already exists
        const seenTx = await seenTransactionModel.findOne({
          transactionHash: result.transactionHash,
        });
        console.log('seenTx', seenTx);
        if (seenTx) {
          console.log('transaction already applied ');
          return;
        }

        console.log(
          `decoding ${PROXY_AUCTION_ABI[3]['name']} eventLogs DutchAuctionEvents`,
        );
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

        if (auctionType == 'dutch') {
          _createBasketAuction(
            result,
            auctionId,
            auctionOwner,
            auctionType,
            basketId,
            startTime,
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

const DutchConfigureAuctionEventSubscription = async function () {
  await updateLastSyncedBlock();

  // Subscribing to AuctionConfigure Dutch event
  await web3.eth.subscribe(
    'logs',
    {
      address: config.NETWORK_CONFIG.DUTCH_CONTRACT_ADDRESS.toLowerCase(),
    },
    async function (err, result) {
      if (
        !err &&
        result.address.toLowerCase() ===
          config.NETWORK_CONFIG.DUTCH_CONTRACT_ADDRESS.toLowerCase() &&
        result.topics[0] ===
          config.EVENT_TOPIC_SIGNATURES.DUTCH_CONFIGURE_AUCTION
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
        console.log(
          `decoding ${DUTCH_CONTRACT_ABI[2]['name']} eventLogs in DutchAuctionEvents`,
        );
        const decodedData = web3.eth.abi.decodeLog(
          DUTCH_CONTRACT_ABI[2]['inputs'],
          result.data,
          result.topics.slice(1),
        );
        const auctionId = decodedData.auctionId;
        const startTime = decodedData.startTime;
        const reservePrice = decodedData.reservePrice;
        const dropAmount = decodedData.dropAmount;
        const openingPrice = decodedData.openingPrice;
        const roundDuration = decodedData.roundDuration;

        await _configureAuction(
          result,
          auctionId,
          openingPrice,
          roundDuration,
          startTime,
          reservePrice,
          dropAmount,
        );

        console.log('syncedBlock configure', config.LAST_SYNCED_BLOCK);
      }
    },
  );
};

const DutchAcceptPriceEventSubscription = async function () {
  await updateLastSyncedBlock();

  // Subscribing to AcceptPrice dutch event
  await web3.eth.subscribe(
    'logs',
    {
      address: config.NETWORK_CONFIG.DUTCH_CONTRACT_ADDRESS.toLowerCase(),
    },
    async function (err, result) {
      if (
        !err &&
        result.address.toLowerCase() ===
          config.NETWORK_CONFIG.DUTCH_CONTRACT_ADDRESS.toLowerCase() &&
        result.topics[0] === config.EVENT_TOPIC_SIGNATURES.DUTCH_ACCEPT_PRICE
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

        console.log(
          `decoding ${DUTCH_CONTRACT_ABI[5]['name']} eventLogs in DutchAuctionEvents`,
        );
        const decodedData = web3.eth.abi.decodeLog(
          DUTCH_CONTRACT_ABI[5]['inputs'],
          result.data,
          result.topics.slice(1),
        );
        const auctionId = decodedData.auctionId;
        const winningBid = decodedData.winningBid;
        const auctionWinner = decodedData.winner;

        await _acceptPrice(result, auctionId, winningBid, auctionWinner);
        console.log('syncedBlock bid', config.LAST_SYNCED_BLOCK);
      }
    },
  );
};

const DutchAuctionCancelEventSubscription = async function () {
  await updateLastSyncedBlock();

  // Subscribing to AuctionCancel dutch event
  await web3.eth.subscribe(
    'logs',
    {
      address: config.NETWORK_CONFIG.DUTCH_CONTRACT_ADDRESS.toLowerCase(),
    },
    async function (err, result) {
      if (
        !err &&
        result.address.toLowerCase() ===
          config.NETWORK_CONFIG.DUTCH_CONTRACT_ADDRESS.toLowerCase() &&
        result.topics[0] === config.EVENT_TOPIC_SIGNATURES.DUTCH_AUCTION_CANCEL
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

        console.log(
          `decoding ${DUTCH_CONTRACT_ABI[1]['name']} eventLogs in DutchAuctionEvents`,
        );
        const decodedData = web3.eth.abi.decodeLog(
          DUTCH_CONTRACT_ABI[1]['inputs'],
          result.data,
          result.topics.slice(1),
        );
        const auctionId = decodedData.auctionId;

        await _cancelAuction(result, auctionId);
        console.log('syncedBlock Cancel 1', config.LAST_SYNCED_BLOCK);
      }
    },
  );
};

async function updateLastSyncedBlock() {
  await web3.eth.subscribe('newBlockHeaders', async function (err, result) {
    if (!err) {
      config.LAST_SYNCED_BLOCK = result.number;
    }
  });
  return config.LAST_SYNCED_BLOCK;
}

let processing = false;
let initialised = false;

const scrapeDutchAuctionEventLogs = async function () {
  try {
    if (processing || !initialised) {
      return;
    }
    processing = true;
    console.log('Scraping dutch contract event logs ...');
    const lastSeenBlockRes = await lastSeenBlocksModel.findOne();

    const lastSeenBlock = lastSeenBlockRes.blockNumberDutch;

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
      const allEventLogs = await DutchAuctionContract.getPastEvents(
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
      console.log('allEventLogsProxy Dutch', allEventLogsProxy);
      console.log('allEventLogs', allEventLogs);
      let promises = [];
      for (const element of allEventLogs) {
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
            for (const item of allEventLogsProxy) {
              if (
                item.event == 'AuctionCreateProxy' &&
                item.returnValues.auction_type === AUCTION.DUTCH &&
                item.transactionHash == element.transactionHash
              ) {
                const auctionId = element.returnValues.auctionId;
                const auctionOwner = element.returnValues.auctionOwner;
                const tokenContractAddress =
                  item.returnValues.tokenContractAddress;
                const assetTokenId = item.returnValues.tokenId;
                const assetQuantity = item.returnValues.quantity;
                const auctionType = item.returnValues.auction_type;
                const startTime = element.returnValues.startTime;
                if (auctionType === AUCTION.DUTCH) {
                  promises.push(
                    _createAuction(
                      element,
                      auctionId,
                      auctionOwner,
                      auctionType,
                      assetTokenId,
                      assetQuantity,
                      tokenContractAddress,
                      startTime,
                    ),
                  );
                }
              } else if (
                item.event == 'BasketAuctionCreateProxy' &&
                item.returnValues.auction_type === AUCTION.DUTCH &&
                item.transactionHash == element.transactionHash
              ) {
                const auctionId = element.returnValues.auctionId;
                const auctionOwner = element.returnValues.auctionOwner;
                const auctiontype = item.returnValues.auction_type;
                const basketId = item.returnValues.basketId;
                const startTime = element.returnValues.startTime;
                promises.push(
                  _createBasketAuction(
                    element,
                    auctionId,
                    auctionOwner,
                    auctiontype,
                    basketId,
                    startTime,
                  ),
                );
              }
            }
            break;
          }

          case 'AuctionConfigure': {
            const openingPrice = element.returnValues.openingPrice;
            const reservePrice = element.returnValues.reservePrice;
            const startTimestamp = element.returnValues.startTime;
            const dropAmount = element.returnValues.dropAmount;
            const roundDuration = element.returnValues.roundDuration;
            const auctionId = element.returnValues.auctionId;
            promises.push(
              _configureAuction(
                element,
                auctionId,
                openingPrice,
                roundDuration,
                startTimestamp,
                reservePrice,
                dropAmount,
              ),
            );
            break;
          }

          case 'PriceAccept': {
            const auctionId = element.returnValues.auctionId;
            const winBid = element.returnValues.winningBid;
            const auctionWinner = element.returnValues.winner;
            promises.push(
              _acceptPrice(element, auctionId, winBid, auctionWinner),
            );

            break;
          }

          case 'AuctionCancel': {
            const auctionId = element.returnValues.auctionId;
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
      { blockNumberDutch: toBlock },
      { new: true },
    );
    await resp.save();
  } catch (error) {
    console.error(error);
  } finally {
    processing = false;
  }
};

// Initialize scrapeDutchAuctionEventLogs
const initScrapeDutchAuctionEventLogs = async function (lastSeenBlockRes) {
  try {
    console.log('Initializing dutch contract event logs ...');

    const lastSeenBlock = lastSeenBlockRes.blockNumberDutch;

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
      const allEventLogs = await DutchAuctionContract.getPastEvents(
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

      console.log('allEventLogsProxy Dutch', allEventLogsProxy);
      console.log('allEventLogs', allEventLogs);

      for (const element of allEventLogs) {
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
            for (const item of allEventLogsProxy) {
              if (
                item.event == 'AuctionCreateProxy' &&
                item.returnValues.auction_type === AUCTION.DUTCH &&
                item.transactionHash == element.transactionHash
              ) {
                const auctionId = element.returnValues.auctionId;
                const auctionOwner = element.returnValues.auctionOwner;
                const tokenContractAddress =
                  item.returnValues.tokenContractAddress;
                const assetTokenId = item.returnValues.tokenId;
                const assetQuantity = item.returnValues.quantity;
                const auctionType = item.returnValues.auction_type;
                const startTime = element.returnValues.startTime;
                if (auctionType === AUCTION.DUTCH) {
                  await _createAuction(
                    element,
                    auctionId,
                    auctionOwner,
                    auctionType,
                    assetTokenId,
                    assetQuantity,
                    tokenContractAddress,
                    startTime,
                  );
                }
              } else if (
                item.event == 'BasketAuctionCreateProxy' &&
                item.returnValues.auction_type === AUCTION.DUTCH &&
                item.transactionHash == element.transactionHash
              ) {
                const auctionId = element.returnValues.auctionId;
                const auctionOwner = element.returnValues.auctionOwner;
                const auctiontype = item.returnValues.auction_type;
                const basketId = item.returnValues.basketId;
                const startTime = element.returnValues.startTime;
                await _createBasketAuction(
                  element,
                  auctionId,
                  auctionOwner,
                  auctiontype,
                  basketId,
                  startTime,
                );
              }
            }
            break;
          }

          case 'AuctionConfigure': {
            const openingPrice = element.returnValues.openingPrice;
            const reservePrice = element.returnValues.reservePrice;
            const startTimestamp = element.returnValues.startTime;
            const dropAmount = element.returnValues.dropAmount;
            const roundDuration = element.returnValues.roundDuration;
            const auctionId = element.returnValues.auctionId;
            await _configureAuction(
              element,
              auctionId,
              openingPrice,
              roundDuration,
              startTimestamp,
              reservePrice,
              dropAmount,
            );
            break;
          }

          case 'PriceAccept': {
            const auctionId = element.returnValues.auctionId;
            const winBid = element.returnValues.winningBid;
            const auctionWinner = element.returnValues.winner;
            await _acceptPrice(element, auctionId, winBid, auctionWinner);

            break;
          }

          case 'AuctionCancel': {
            const auctionId = element.returnValues.auctionId;
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
      { blockNumberDutch: toBlock },
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
  auctionType,
  assetTokenId,
  assetQuantity,
  tokenContractAddress,
  startTime,
) {
  const getAuction = await auctionModel.findOne({
    auctionId: auctionId,
  });

  if (getAuction) {
    console.log('Auction Id already exists');
    return;
  }

  console.log('### Create Dutch Auction ###');
  const getAsset = await assetsModel.findOne({
    assetContractAddress: tokenContractAddress,
    assetTokenId: assetTokenId,
    owner: auctionOwner,
  });
  if (getAsset) {
    const dbAuction = new auctionModel({
      auctionId: auctionId,
      seller: auctionOwner,
      state: 'NOT-STARTED',
      auctionType: auctionType,
      assetTokenId: assetTokenId,
      assetQuantity: assetQuantity,
      tokenContract: tokenContractAddress,
      dutchAuctionAttribute: {
        opening_price: 0,
        round_duration: 0,
        start_timestamp: startTime * 1000,
        start_datetime: new Date(startTime * 1000),
        reserve_price: 0,
        drop_amount: 0,
        winning_bid: 0,
      },
      assetId: getAsset.assetId,
      fk_assetId: getAsset._id,
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

async function _createBasketAuction(
  eventLog,
  auctionId,
  auctionOwner,
  auctionType,
  basketId,
  startTime,
) {
  const getBasket = await basketModel.findOne({
    basketId: basketId,
  });
  if (getBasket) {
    console.log(' ### Create Dutch Basket Auction ### ');
    const dbAuction = new auctionModel({
      auctionId: auctionId,
      seller: auctionOwner,
      state: 'NOT-STARTED',
      auctionType: auctionType,
      basketId: basketId,
      fk_basketId: getBasket._id,
      dutchAuctionAttribute: {
        opening_price: 0,
        round_duration: 0,
        start_timestamp: startTime * 1000,
        start_datetime: new Date(startTime * 1000),
        reserve_price: 0,
        drop_amount: 0,
        winning_bid: 0,
      },
    });
    await dbAuction.save();
    await getBasket.update({ basketState: BASKET_STATES.LISTED });
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
  roundDuration,
  startTimestamp,
  reservePrice,
  dropAmount,
) {
  await auctionModel.updateOne(
    { auctionId: auctionId },
    {
      dutchAuctionAttribute: {
        opening_price: openingPrice,
        round_duration: roundDuration,
        start_timestamp: startTimestamp * 1000,
        start_datetime: new Date(startTimestamp * 1000),
        reserve_price: reservePrice,
        drop_amount: dropAmount,
        winning_bid: 0,
      },
      state: 'ONGOING',
    },
  );

  await listAssetHistoryHelper(eventLog, auctionId, AUCTION.DUTCH);

  const seentxConfigure = new seenTransactionModel({
    transactionHash: eventLog.transactionHash,
    blockNumber: eventLog.blockNumber,
    eventLog: eventLog,
    state: 'APPLIED',
  });
  await seentxConfigure.save();
}

async function _acceptPrice(eventLog, auctionId, winningBid, auctionWinner) {
  await auctionModel.updateMany(
    { auctionId: auctionId },
    {
      $set: { 'dutchAuctionAttribute.winning_bid': winningBid },
      buyer: auctionWinner,
      state: 'SUCCESSFULLY-COMPLETED',
    },
  );

  //change owner in asset schema

  await changeOwnership(auctionId, auctionWinner);

  //make entry in asset history
  await transferAssetHistoryHelper(
    eventLog,
    auctionId,
    winningBid,
    auctionWinner,
  );

  const seentxPriceAccept = new seenTransactionModel({
    transactionHash: eventLog.transactionHash,
    blockNumber: eventLog.blockNumber,
    eventLog: eventLog,
    state: 'APPLIED',
  });
  await seentxPriceAccept.save();
}

async function _cancelAuction(eventLog, auctionId) {
  await auctionModel.updateOne(
    { auctionId: auctionId },
    {
      $set: { 'dutchAuctionAttribute.winning_bid': 0 },
      state: 'CANCELLED',
    },
  );

  //make entry in asset history
  await cancelListAssetHistoryHelper(eventLog, auctionId, AUCTION.DUTCH);

  const seentxCancel = new seenTransactionModel({
    transactionHash: eventLog.transactionHash,
    blockNumber: eventLog.blockNumber,
    eventLog: eventLog,
    state: 'APPLIED',
  });
  await seentxCancel.save();
}
module.exports = {
  DutchCreateAuctionEventSubscription,
  DutchConfigureAuctionEventSubscription,
  DutchAcceptPriceEventSubscription,
  DutchAuctionCancelEventSubscription,
  scrapeDutchAuctionEventLogs,
  initScrapeDutchAuctionEventLogs,
};
