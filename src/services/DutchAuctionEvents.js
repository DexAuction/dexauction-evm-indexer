const Web3 = require('web3');
const config = require('../config');
const web3 = new Web3(config.NETWORK_CONFIG.WS_NETWORK_URL);
const auctionModel = require('../models/auctions');
const assetsModel = require('../models/assets');
const lastSeenBlocksModel = require('../models/last_seen_blocks');
const basketModel = require('../models/baskets');
const seenTransactionModel = require('../models/seenTransaction');
const { DUTCH_CONTRACT_ABI, PROXY_AUCTION_ABI } = require('../abi');
const { AUCTION } = require('../constants');
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

  let auctionID;
  let auctionOwner;
  let startTimeDecode;
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
        auctionID = web3.eth.abi.decodeParameter('uint256', result.topics[1]);
        auctionOwner = web3.eth.abi.decodeParameter(
          'address',
          result.topics[2],
        );
        startTimeDecode = web3.eth.abi.decodeParameter(
          'uint256',
          result.topics[3],
        );
      }
    },
  );

  // Subscribing AuctionCreateProxy event
  await web3.eth.subscribe(
    'logs',
    {
      address: config.NETWORK_CONFIG.PROXY_ADDRESS.toLowerCase(),
    },

    async function (err, result2) {
      if (
        !err &&
        result2.address.toLowerCase() ===
          config.NETWORK_CONFIG.PROXY_ADDRESS.toLowerCase() &&
        result2.topics[0] === config.EVENT_TOPIC_SIGNATURES.AUCTION_CREATE_PROXY
      ) {
        console.log('result 2', result2);
        const auctionTypeHex = '0x' + result2.data.substring(194);
        const auctionTypeDecode = web3.utils.hexToUtf8(auctionTypeHex);
        const tokenIdHex = '0x' + result2.data.substring(66, 130);
        const tokenIdDecode = web3.eth.abi.decodeParameter(
          'uint256',
          tokenIdHex,
        );

        const tokenContractAddress = web3.eth.abi.decodeParameter(
          'address',
          result2.topics[3],
        );
        if (auctionTypeDecode === AUCTION.DUTCH_AUCTION) {
          const seenTx = await seenTransactionModel.findOne({
            transactionHash: result2.transactionHash,
          });
          if (seenTx) {
            console.log(
              `transaction already applied , Transaction hash: ${result2.transactionHash}`,
            );
            return;
          }

          //save in DB

          _createAuction(
            result2.transactionHash,
            result2,
            auctionID,
            auctionOwner,
            auctionTypeDecode,
            tokenIdDecode,
            tokenContractAddress,
            startTimeDecode,
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

    async function (err, result3) {
      if (
        !err &&
        result3.address.toLowerCase() ===
          config.NETWORK_CONFIG.PROXY_ADDRESS.toLowerCase() &&
        result3.topics[0] ===
          config.EVENT_TOPIC_SIGNATURES.BASKET_AUCTION_CREATE_PROXY
      ) {
        console.log('Result basket auction from Dutch ', result3);
        const auctionID = web3.eth.abi.decodeParameter(
          'uint256',
          result3.topics[1],
        );
        const auctionOwner = web3.eth.abi.decodeParameter(
          'address',
          result3.topics[2],
        );
        const basketId = web3.eth.abi.decodeParameter(
          'uint256',
          result3.topics[3],
        );
        const auctionTypeHex = '0x' + result3.data.substring(130, 194);
        const auctionTypeDecode = web3.utils.hexToUtf8(auctionTypeHex);

        //check if transaction hash already exists

        const seenTx = await seenTransactionModel.findOne({
          transactionHash: result3.transactionHash,
        });
        console.log('seenTx', seenTx);
        if (seenTx) {
          console.log('transaction already applied ');
          return;
        }

        //save in DB

        if (auctionTypeDecode == 'dutch') {
          _createBasketAuction(
            result3.transactionHash,
            result3,
            auctionID,
            auctionOwner,
            auctionTypeDecode,
            basketId,
            startTimeDecode,
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

  let openingPriceDecode;
  let auctionID;
  let auctionOwner;
  let startTimeDecode;
  let reservePriceDecode;
  let roundDurationDecode;
  let dropAmountDecode;

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
        console.log('syncedBlock configure', config.LAST_SYNCED_BLOCK);

        auctionID = web3.eth.abi.decodeParameter('uint256', result.topics[1]);
        auctionOwner = web3.eth.abi.decodeParameter(
          'address',
          result.topics[2],
        );
        startTimeDecode = web3.eth.abi.decodeParameter(
          'uint256',
          result.data.substring(0, 66),
        );

        const reservePriceHex = '0x' + result.data.substring(66, 130);
        reservePriceDecode = web3.eth.abi.decodeParameter(
          'uint256',
          reservePriceHex,
        );

        const dropAmountHex = '0x' + result.data.substring(130, 194);
        dropAmountDecode = web3.eth.abi.decodeParameter(
          'uint256',
          dropAmountHex,
        );
        const openingPriceHex = '0x' + result.data.substring(194, 258);
        openingPriceDecode = web3.eth.abi.decodeParameter(
          'uint256',
          openingPriceHex,
        );
        const roundDurationHex = '0x' + result.data.substring(258, 322);
        roundDurationDecode = web3.eth.abi.decodeParameter(
          'uint256',
          roundDurationHex,
        );

        await _configureAuction(
          result,
          auctionID,
          openingPriceDecode,
          roundDurationDecode,
          startTimeDecode,
          reservePriceDecode,
          dropAmountDecode,
        );
      }
    },
  );
};

const DutchAcceptPriceEventSubscription = async function () {
  await updateLastSyncedBlock();
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
        const auctionID = web3.eth.abi.decodeParameter(
          'uint256',
          result.topics[1],
        );
        const winningBid = web3.eth.abi.decodeParameter(
          'uint256',
          result.topics[2],
        );
        const auctionWinner = web3.eth.abi.decodeParameter(
          'address',
          result.topics[3],
        );

        await _acceptPrice(result, auctionID, winningBid, auctionWinner);
        console.log('syncedBlock bid', config.LAST_SYNCED_BLOCK);
      }
    },
  );
};

const DutchAuctionCancelEventSubscription = async function () {
  await updateLastSyncedBlock();
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
        const auctionID = web3.eth.abi.decodeParameter(
          'uint256',
          result.topics[1],
        );

        await _cancelAuction(element, auctionID);
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
                item.event == 'AuctionCreateProxy' &&
                item.returnValues.auction_type === AUCTION.DUTCH_AUCTION &&
                item.transactionHash == element.transactionHash
              ) {
                const tokenContractAddress = item.returnValues.tokenContractAddress;
                const tokenId = item.returnValues.tokenId;
                const auctiontype = item.returnValues.auction_type;
                if (auctiontype === AUCTION.DUTCH_AUCTION) {
                  promises.push(
                    _createAuction(
                      element.transactionHash,
                      element,
                      element.returnValues.auctionId,
                      element.returnValues.auctionOwner,
                      auctiontype,
                      tokenId,
                      tokenContractAddress,
                      element.returnValues.startTime,
                    ),
                  );
                }
              } else if (
                item.event == 'BasketAuctionCreateProxy' &&
                item.returnValues.auction_type === AUCTION.DUTCH_AUCTION &&
                item.transactionHash == element.transactionHash
              ) {
                const auctiontype = item.returnValues.auction_type;
                const basketId = item.returnValues.basketId;
                promises.push(
                  _createBasketAuction(
                    element.transactionHash,
                    element,
                    element.returnValues.auctionId,
                    element.returnValues.auctionOwner,
                    auctiontype,
                    basketId,
                    element.returnValues.startTime,
                  ),
                );
              }
            }
            break;
          }
          case 'AuctionConfigure': {
            const openingPriceDecode = element.returnValues.openingPrice;
            const reservePriceDecode = element.returnValues.reservePrice;
            const startTimestamp = element.returnValues.startTime;
            const dropAmount = element.returnValues.dropAmount;
            const roundDuration = element.returnValues.roundDuration;
            const auctionId = element.returnValues.auctionId;
            promises.push(
              _configureAuction(
                element,
                auctionId,
                openingPriceDecode,
                roundDuration,
                startTimestamp,
                reservePriceDecode,
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
          case 'AuctionCreate':
            let tokenContractAddress;
            let tokenID;
            let auctiontype;
            for (item of allEventLogsProxy) {
              if (
                item.event == 'AuctionCreateProxy' &&
                item.returnValues.auction_type === AUCTION.DUTCH_AUCTION &&
                item.transactionHash == element.transactionHash
              ) {
                tokenContractAddress = item.returnValues.tokenContractAddress;
                tokenID = item.returnValues.tokenId;
                auctiontype = item.returnValues.auction_type;
                if (auctiontype === AUCTION.DUTCH_AUCTION) {
                  _createAuction(
                    element.transactionHash,
                    element,
                    element.returnValues.auctionId,
                    element.returnValues.auctionOwner,
                    auctiontype,
                    tokenID,
                    tokenContractAddress,
                    element.returnValues.startTime,
                  );
                }
              } else if (
                item.event == 'BasketAuctionCreateProxy' &&
                item.returnValues.auction_type === AUCTION.DUTCH_AUCTION &&
                item.transactionHash == element.transactionHash
              ) {
                auctiontype = item.returnValues.auction_type;
                _createBasketAuction(
                  element.transactionHash,
                  element,
                  element.returnValues.auctionID,
                  element.returnValues.auctionOwner,
                  auctiontype,
                  item.returnValues.basketId,
                  element.returnValues.startTime,
                  element.returnValues.endTime,
                );
              }
            }

            break;

          case 'AuctionConfigure':
            let openingPriceDecode = element.returnValues.openingPrice;
            let reservePriceDecode = element.returnValues.reservePrice;
            let startTimestamp = element.returnValues.startTime;
            let dropAmount = element.returnValues.dropAmount;
            let roundDuration = element.returnValues.roundDuration;
            let auctionID = element.returnValues.auctionId;
            _configureAuction(
              element,
              auctionID,
              openingPriceDecode,
              roundDuration,
              startTimestamp,
              reservePriceDecode,
              dropAmount,
            );
            break;
          case 'PriceAccept':
            let AuctionId = element.returnValues.auctionId;
            let winBid = element.returnValues.winningBid;
            let auctionWinner = element.returnValues.winner;
            _acceptPrice(element, AuctionId, winBid, auctionWinner);
            break;
          case 'AuctionCancel':
            let auctionId = element.returnValues.auctionId;
            _cancelAuction(element, auctionId);
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
  auctiontype,
  tokenId,
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
    assetTokenId: tokenId,
  });
  if (getAsset) {
    const dbAuction = new auctionModel({
      auctionId: auctionId,
      seller: auctionOwner,
      state: 'NOT-STARTED',
      auctionType: auctiontype,
      assetTokenId: tokenId,
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
  let getBasket = await basketModel.findOne({
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

    //update basket with auction details
    await basketModel.updateOne(
      { basketId: basketId },
      {
        auctionId: auctionId,
        fk_auctionId: dbAuction._id,
      },
    );
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
  openingPriceDecode,
  roundDuration,
  startTimestamp,
  reservePriceDecode,
  dropAmount,
) {
  await auctionModel.updateOne(
    { auctionId: auctionId },
    {
      dutchAuctionAttribute: {
        opening_price: openingPriceDecode,
        round_duration: roundDuration,
        start_timestamp: startTimestamp * 1000,
        start_datetime: new Date(startTimestamp * 1000),
        reserve_price: reservePriceDecode,
        drop_amount: dropAmount,
        winning_bid: 0,
      },
      state: 'ONGOING',
    },
  );

  await listAssetHistoryHelper(eventLog, auctionId, AUCTION.DUTCH_AUCTION);

  const seentxConfigure = new seenTransactionModel({
    transactionHash: eventLog.transactionHash,
    blockNumber: eventLog.blockNumber,
    eventLog: eventLog,
    state: 'APPLIED',
  });
  await seentxConfigure.save();
}

async function _acceptPrice(eventLog, auctionId, winBid, auctionWinner) {
  await auctionModel.updateMany(
    { auctionId: auctionId },
    {
      $set: { 'dutchAuctionAttribute.winning_bid': winBid },
      buyer: auctionWinner,
      state: 'SUCCESSFULLY-COMPLETED',
    },
  );

  //change owner in asset schema

  await changeOwnership(auctionId, auctionWinner);

  //make entry in asset history
  await transferAssetHistoryHelper(eventLog, auctionId, winBid, auctionWinner);

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
  await cancelListAssetHistoryHelper(
    eventLog,
    auctionId,
    AUCTION.DUTCH_AUCTION,
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
  DutchCreateAuctionEventSubscription,
  DutchConfigureAuctionEventSubscription,
  DutchAcceptPriceEventSubscription,
  DutchAuctionCancelEventSubscription,
  scrapeDutchAuctionEventLogs,
  initScrapeDutchAuctionEventLogs,
};
