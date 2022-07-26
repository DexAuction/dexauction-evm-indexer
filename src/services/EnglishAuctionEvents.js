const res = require("express/lib/response");
const Web3 = require("web3");
const config = require("../config");
const web3 = new Web3(config.NETWORK_CONFIG.WS_NETWORK_URL);
const auctionModel = require("../models/auction");
const lastSeenBlocksModel = require("../models/last_seen_blocks");
const seenTransactionModel = require("../models/seenTransaction");
const { ENGLISH_AUCTION_ABI, PROXY_AUCTION_ABI } = require("../abi");
const utils = require("../helper/utils");
const EnglishAuctionContract = new web3.eth.Contract(
  ENGLISH_AUCTION_ABI,
  config.NETWORK_CONFIG.ENGLISH_AUCTION_ADDRESS
);
const ProxyContract = new web3.eth.Contract(
  PROXY_AUCTION_ABI,
  config.NETWORK_CONFIG.PROXY_ADDRESS
);

const EnglishCreateAuctionEventSubscription = async function () {
  await updateLastSyncedBlock();

  let openingPrice;
  let startTimeDecode;
  let endTimeDecode;
  let minIncrementDecode;
  let buyOutPriceDecode;
  let softCloseDuratioDecode;
  let auctionID;
  let auctionOwner;
  const subscribingAuctionCreate = await web3.eth.subscribe(
    "logs",
    {
      address: config.NETWORK_CONFIG.ENGLISH_AUCTION_ADDRESS.toLowerCase(),
    },

    async function (err, result) {
      if (
        !err &&
        result.address.toLowerCase() ===
          config.NETWORK_CONFIG.ENGLISH_AUCTION_ADDRESS.toLowerCase() &&
        result.topics[0] ===
          "0x5f6e9130c3f991e5678d5df51f9547926db4b428e3bfdf539f463a0f6416e42c"
      ) {
        openingPrice = web3.eth.abi.decodeParameter(
          "uint256",
          result.data.substring(0, 66)
        );
        const minIncrementinHex = "0x" + result.data.substring(66, 130);
        minIncrementDecode = web3.eth.abi.decodeParameter(
          "uint256",
          minIncrementinHex
        );
        const buyOutPriceHex = "0x" + result.data.substring(130, 194);
        buyOutPriceDecode = web3.eth.abi.decodeParameter(
          "uint256",
          buyOutPriceHex
        );
        const softCloseDurationHex = "0x" + result.data.substring(194, 258);
        softCloseDuratioDecode = web3.eth.abi.decodeParameter(
          "uint256",
          softCloseDurationHex
        );
        const startTimeHex = "0x" + result.data.substring(258, 322);
        startTimeDecode = web3.eth.abi.decodeParameter("uint256", startTimeHex);
        const endTimeHex = "0x" + result.data.substring(322);
        endTimeDecode = web3.eth.abi.decodeParameter("uint256", endTimeHex);
        auctionID = web3.eth.abi.decodeParameter("uint256", result.topics[1]);
        auctionOwner = web3.eth.abi.decodeParameter(
          "address",
          result.topics[2]
        );
      }
    }
  );
  const subscribingAuctionCreateProxy = await web3.eth.subscribe(
    "logs",
    {
      address: config.NETWORK_CONFIG.PROXY_ADDRESS.toLowerCase(),
    },

    async function (err, result2) {
      if (
        !err &&
        result2.address.toLowerCase() ===
          config.NETWORK_CONFIG.PROXY_ADDRESS.toLowerCase() &&
        result2.topics[0] ===
          "0xaa53b7d866501db7f1ccfc14acad91862e63106905d565bf9fd2f4800505f6b1"
      ) {
        const auctionTypeHex = "0x" + result2.data.substring(194);
        const auctionTypeDecode = web3.utils.hexToUtf8(auctionTypeHex);
        const tokenIdHex = "0x" + result2.data.substring(66, 130);
        const tokenIdDecode = web3.eth.abi.decodeParameter(
          "uint256",
          tokenIdHex
        );

        const tokenContractAddress = web3.eth.abi.decodeParameter(
          "address",
          result2.topics[3]
        );
        //check if transaction hash already exists

        const seenTx = await seenTransactionModel.findOne({
          transactionHash: result2.transactionHash,
        });
        console.log("seenTx", seenTx);
        if (seenTx) {
          console.log("transaction already applied ");
          return;
        }

        //save in DB

        if (auctionTypeDecode == "english") {
          _createAuction(
            result2.transactionHash,
            result2,
            auctionID,
            auctionOwner,
            auctionTypeDecode,
            tokenIdDecode,
            tokenContractAddress,
            startTimeDecode,
            endTimeDecode
          );
          console.log("syncedblock create", config.LAST_SYNCED_BLOCK);
        }
      }
    }
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

  let openingPriceDecode;
  let auctionID;
  let auctionOwner;
  let startTimeDecode;
  let endTimeDecode;
  let minIncrementDecode;
  let buyOutPriceDecode;
  let softCloseDuratioDecode;
  await web3.eth.subscribe(
    "logs",
    {
      address: config.NETWORK_CONFIG.ENGLISH_AUCTION_ADDRESS.toLowerCase(),
    },
    async function (err, result) {
      if (
        !err &&
        result.address.toLowerCase() ===
          config.NETWORK_CONFIG.ENGLISH_AUCTION_ADDRESS.toLowerCase() &&
        result.topics[0] ===
          "0x778db73461320c581d7308b972ca3e9c16ffce06149dc94175298d0d03365cf2"
      ) {
        console.log("result Configure ", result);
        const seenTx = await seenTransactionModel.findOne({
          transactionHash: result.transactionHash,
        });
        if (seenTx) {
          console.log(
            `transaction already applied with transaction hash ${result.transactionHash}`
          );
          return;
        }

        console.log("syncedBlock configure", config.LAST_SYNCED_BLOCK);
        auctionID = web3.eth.abi.decodeParameter("uint256", result.topics[1]);
        auctionOwner = web3.eth.abi.decodeParameter(
          "address",
          result.topics[2]
        );
        startTimeDecode = web3.eth.abi.decodeParameter(
          "uint256",
          result.data.substring(0, 66)
        );

        const endTimeHex = "0x" + result.data.substring(66, 130);
        endTimeDecode = web3.eth.abi.decodeParameter("uint256", endTimeHex);

        const softCloseDurationHex = "0x" + result.data.substring(130, 194);
        softCloseDuratioDecode = web3.eth.abi.decodeParameter(
          "uint256",
          softCloseDurationHex
        );
        const openingPriceHex = "0x" + result.data.substring(194, 258);
        openingPriceDecode = web3.eth.abi.decodeParameter(
          "uint256",
          openingPriceHex
        );
        const buyOutPriceHex = "0x" + result.data.substring(258, 322);
        buyOutPriceDecode = web3.eth.abi.decodeParameter(
          "uint256",
          buyOutPriceHex
        );
        const minIncrementinHex = "0x" + result.data.substring(322);
        minIncrementDecode = web3.eth.abi.decodeParameter(
          "uint256",
          minIncrementinHex
        );

        await auctionModel.updateOne(
          { auctionId: auctionID },
          {
            englishAuctionAttribute: {
              opening_price: openingPriceDecode,
              min_increment: minIncrementDecode,
              start_timestamp: startTimeDecode * 1000,
              end_timestamp: endTimeDecode * 1000,
              start_datetime: new Date(startTimeDecode * 1000),
              end_datetime: new Date(endTimeDecode * 1000),
              soft_close_duration: softCloseDuratioDecode,
              buyout_price: buyOutPriceDecode,
              winning_bid: 0,
            },
            state: "ONGOING",
          }
        );
        const seentx = new seenTransactionModel({
          transactionHash: result.transactionHash,
          blockNumber: result.blockNumber,
          eventLog: result,
          state: "APPLIED",
        });
        await seentx.save();
      }
    }
  );
};

const EnglishPlaceBidEventSubscription = async function () {
  await updateLastSyncedBlock();
  await web3.eth.subscribe(
    "logs",
    {
      address: config.NETWORK_CONFIG.ENGLISH_AUCTION_ADDRESS.toLowerCase(),
    },
    async function (err, result) {
      if (
        !err &&
        result.address.toLowerCase() ===
          config.NETWORK_CONFIG.ENGLISH_AUCTION_ADDRESS.toLowerCase() &&
        result.topics[0] ===
          "0x5f40cf581002f0c6368477b76b97ed3bab00a2804aee9ec09328cbcbc5304aec"
      ) {
        console.log("result Bid ", result);
        const seenTx = await seenTransactionModel.findOne({
          transactionHash: result.transactionHash,
        });
        if (seenTx) {
          console.log(
            `transaction already applied with transaction hash ${result.transactionHash}`
          );
          return;
        }
        const auctionID = web3.eth.abi.decodeParameter(
          "uint256",
          result.topics[1]
        );

        const Bid = web3.eth.abi.decodeParameter("uint256", result.topics[2]);

        const bidder = web3.eth.abi.decodeParameter(
          "address",
          result.topics[3]
        );

        await auctionModel.updateMany(
          { auctionId: auctionID },
          {
            $push: {
              "englishAuctionAttribute.bids": [
                {
                  address: bidder,
                  bid: Bid,
                },
              ],
              bidders: bidder,
            },
          }
        );
        const seentx = new seenTransactionModel({
          transactionHash: result.transactionHash,
          blockNumber: result.blockNumber,
          eventLog: result,
          state: "APPLIED",
        });
        await seentx.save();
        console.log("syncedBlock bid", config.LAST_SYNCED_BLOCK);
      }
    }
  );
};

const EnglishAuctionEndEventSubscription = async function () {
  await updateLastSyncedBlock();
  await web3.eth.subscribe(
    "logs",
    {
      address: config.NETWORK_CONFIG.PROXY_ADDRESS.toLowerCase(),
    },
    async function (err, result) {
      if (
        !err &&
        result.address.toLowerCase() ===
          config.NETWORK_CONFIG.PROXY_ADDRESS.toLowerCase() &&
        result.topics[0] ===
          "0x63205d4b0571673d9c1d2319c4a2ed023943c9757f110eefffb8e2c1decdd160"
      ) {
        console.log("result end auction ", result);

        const auctionID = web3.eth.abi.decodeParameter(
          "uint256",
          result.topics[1]
        );
        const winningBid = web3.eth.abi.decodeParameter(
          "uint256",
          result.topics[3]
        );

        console.log("syncedBlock End ", config.LAST_SYNCED_BLOCK);
      }
    }
  );
};
const EnglishAuctionCancelEventSubscription = async function () {
  await updateLastSyncedBlock();
  await web3.eth.subscribe(
    "logs",
    {
      address: config.NETWORK_CONFIG.ENGLISH_AUCTION_ADDRESS.toLowerCase(),
    },
    async function (err, result) {
      if (
        !err &&
        result.address.toLowerCase() ===
          config.NETWORK_CONFIG.ENGLISH_AUCTION_ADDRESS.toLowerCase() &&
        result.topics[0] ===
          "0x1d30295566a0ab516b4cd02b8875bb7e3c7e83307b7cdeb0966216825ab5e4be"
      ) {
        console.log("result cancel auction ", result);
        const seenTx = await seenTransactionModel.findOne({
          transactionHash: result.transactionHash,
        });
        if (seenTx) {
          console.log(
            `transaction already applied with transaction hash ${result.transactionHash}`
          );
          return;
        }
        const auctionID = web3.eth.abi.decodeParameter(
          "uint256",
          result.topics[1]
        );

        await auctionModel.updateOne(
          { auctionId: auctionID },
          {
            state: "CANCELLED",
          }
        );
        const seentx = new seenTransactionModel({
          transactionHash: result.transactionHash,
          blockNumber: result.blockNumber,
          eventLog: result,
          state: "APPLIED",
        });
        await seentx.save();
        console.log("syncedBlock Cancel 1", config.LAST_SYNCED_BLOCK);
      }
    }
  );
};

const EnglishAuctionCompleteEventSubscription = async function () {
  await updateLastSyncedBlock();
  let auctionID;
  let auctionWinner;
  let winningBid;
  await web3.eth.subscribe(
    "logs",
    {
      address: config.NETWORK_CONFIG.ENGLISH_AUCTION_ADDRESS.toLowerCase(),
    },
    async function (err, result) {
      if (
        !err &&
        result.address.toLowerCase() ===
          config.NETWORK_CONFIG.ENGLISH_AUCTION_ADDRESS.toLowerCase() &&
        result.topics[0] ===
          "0x76176cce0ff2d1acbd12eeb335774966211b60f9b0e673348f6168a9ae2f66fb"
      ) {
        console.log("result complete Auction ", result);

        const seenTx = await seenTransactionModel.findOne({
          transactionHash: result.transactionHash,
        });

        if (seenTx) {
          console.log(
            `transaction already applied with transaction hash ${result.transactionHash}`
          );
          return;
        }
        auctionID = web3.eth.abi.decodeParameter("uint256", result.topics[1]);
        auctionWinner = web3.eth.abi.decodeParameter(
          "address",
          result.topics[2]
        );
        winningBid = web3.eth.abi.decodeParameter("uint256", result.topics[3]);

        await auctionModel.updateMany(
          { auctionId: auctionID },
          {
            $set: { "englishAuctionAttribute.winning_bid": winningBid },
            buyer: auctionWinner,
            state: "SUCCESSFULLY-COMPLETED",
          }
        );
        const seentx = new seenTransactionModel({
          transactionHash: result.transactionHash,
          blockNumber: result.blockNumber,
          eventLog: result,
          state: "APPLIED",
        });
        await seentx.save();
        console.log("syncedBlock complete ", config.LAST_SYNCED_BLOCK);
      }
    }
  );
};

async function updateLastSyncedBlock() {
  await web3.eth.subscribe("newBlockHeaders", async function (err, result) {
    if (!err) {
      console.log("result.number ", result.number);
      config.LAST_SYNCED_BLOCK = result.number;
    }
  });
  return config.LAST_SYNCED_BLOCK;
}

let processing = false;

const scrapeEnglishAuctionEventLogs = async function () {
  try {
    if (processing) {
      return;
    }
    processing = true;
    console.log("Scraping marketplace event logs ...");
    const lastSeenBlockRes = await lastSeenBlocksModel.findOne();

    const lastSeenBlock = lastSeenBlockRes.blockNumberEnglish;

    // Start from block next to the last seen block till the latestBlock
    const fromBlock = parseInt(lastSeenBlock) + 1 + "";
    const latestBlock = (await web3.eth.getBlockNumber()) + "";

    const allEventLogs = await EnglishAuctionContract.getPastEvents(
      "allEvents",
      {
        fromBlock,
        toBlock: latestBlock,
      }
    );

    const allEventLogsProxy = await ProxyContract.getPastEvents("allEvents", {
      fromBlock,
      toBlock: latestBlock,
    });
    console.log("allEventLogsProxy English", allEventLogsProxy);
    console.log("allEventLogs", allEventLogs);
    let promises = [];
    for (element of allEventLogs) {
      const seenTx = await seenTransactionModel.findOne({
        transactionHash: element.transactionHash,
      });
      if (seenTx) {
        console.log(
          `transaction already applied with tx hash ${element.transactionHash}`
        );
        continue;
      }
      switch (element.event) {
        case "AuctionCreate":
          let tokenContractAddress;
          let tokenID;
          let auctiontype;

          for (item of allEventLogsProxy) {
            if (
              item.event == "AuctionCreateProxy" &&
              item.returnValues.auction_type == "english" &&
              item.transactionHash == element.transactionHash
            ) {
              tokenContractAddress = item.returnValues.tokenContractAddress;
              tokenID = item.returnValues.tokenId;
              auctiontype = item.returnValues.auction_type;
            }
          }
          promises.push(
            _createAuction(
              element.transactionHash,
              element,
              element.returnValues.auctionID,
              element.returnValues.auctionOwner,
              auctiontype,
              tokenID,
              tokenContractAddress,
              element.returnValues.startTime,
              element.returnValues.endTime
            )
          );
          break;
        case "AuctionConfigure":
          let openingPriceDecode = element.returnValues.openingPrice;
          let minIncrementDecode = element.returnValues.minIncrement;
          let startTimestamp = element.returnValues.startTime;
          let endTimestamp = element.returnValues.endTime;
          let buyOutPrice = element.returnValues.buyOutPrice;
          let softcloseduration = element.returnValues.softCloseDuration;
          let auctionId = element.returnValues.auctionID;
          promises.push(
            _configureAuction(
              element,
              auctionId,
              openingPriceDecode,
              startTimestamp,
              endTimestamp,
              minIncrementDecode,
              softcloseduration,
              buyOutPrice
            )
          );
          break;
        case "PlaceBid":
          let AuctionId = element.returnValues.auctionID;
          let Bid = element.returnValues.bid;
          let bidder = element.returnValues.winner;
          promises.push(_placeBid(element, AuctionId, bidder, Bid));
          break;
        case "AuctionComplete":
          promises.push(_auctionComplete(element));
          break;
        case "AuctionCancel":
          promises.push(_cancelAuction(element));
        default:
          break;
      }
    }
    await Promise.all(promises);
    const resp = await lastSeenBlocksModel.findOneAndUpdate(
      {},
      { blockNumberEnglish: latestBlock },
      { new: true }
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
    if (processing) {
      return;
    }
    processing = true;
    console.log("Scraping marketplace event logs ...");

    //const lastSeenBlockRes = await lastSeenBlocksModel.findOne();

    const lastSeenBlock = lastSeenBlockRes.blockNumberEnglish;

    // Start from block next to the last seen block till the (latestBlock - CONFIRMATION_COUNT)
    const fromBlock = parseInt(lastSeenBlock) + 1 + "";
    const latestBlockNumber = await web3.eth.getBlockNumber();

    let toBlock = 0;

    if (latestBlockNumber > config.CONFIRMATION_COUNT) {
      toBlock = latestBlockNumber - config.CONFIRMATION_COUNT + "";
    }

    const allEventLogs = await EnglishAuctionContract.getPastEvents(
      "allEvents",
      {
        fromBlock,
        toBlock: toBlock,
      }
    );

    const allEventLogsProxy = await ProxyContract.getPastEvents("allEvents", {
      fromBlock,
      toBlock: toBlock,
    });
    console.log("allEventLogsProxy English", allEventLogsProxy);
    console.log("allEventLogs", allEventLogs);
    for (element of allEventLogs) {
      const seenTx = await seenTransactionModel.findOne({
        transactionHash: element.transactionHash,
      });
      if (seenTx) {
        console.log(
          `transaction already applied with tx hash ${element.transactionHash}`
        );
        continue;
      }
      switch (element.event) {
        case "AuctionCreate":
          let tokenContractAddress;
          let tokenID;
          let auctiontype;

          for (item of allEventLogsProxy) {
            if (
              item.event == "AuctionCreateProxy" &&
              item.returnValues.auction_type == "english" &&
              item.transactionHash == element.transactionHash
            ) {
              tokenContractAddress = item.returnValues.tokenContractAddress;
              tokenID = item.returnValues.tokenId;
              auctiontype = item.returnValues.auction_type;
            }
          }
          _createAuction(
            element.transactionHash,
            element,
            element.returnValues.auctionID,
            element.returnValues.auctionOwner,
            auctiontype,
            tokenID,
            tokenContractAddress,
            element.returnValues.startTime,
            element.returnValues.endTime
          );

          break;
        case "AuctionConfigure":
          let openingPriceDecode = element.returnValues.openingPrice;
          let minIncrementDecode = element.returnValues.minIncrement;
          let startTimestamp = element.returnValues.startTime;
          let endTimestamp = element.returnValues.endTime;
          let buyOutPrice = element.returnValues.buyOutPrice;
          let softcloseduration = element.returnValues.softCloseDuration;
          let auctionId = element.returnValues.auctionID;

          await auctionModel.updateOne(
            { auctionId: auctionId },
            {
              englishAuctionAttribute: {
                opening_price: openingPriceDecode,
                min_increment: minIncrementDecode,
                start_timestamp: startTimestamp * 1000,
                end_timestamp: endTimestamp * 1000,
                start_datetime: new Date(startTimestamp * 1000),
                end_datetime: new Date(endTimestamp * 1000),
                soft_close_duration: softcloseduration,
                buyout_price: buyOutPrice,
                winning_bid: 0,
              },
              state: "ONGOING",
            }
          );

          const seentxConfigure = new seenTransactionModel({
            transactionHash: element.transactionHash,
            blockNumber: element.blockNumber,
            eventLog: element,
            state: "APPLIED",
          });
          await seentxConfigure.save();
          break;
        case "PlaceBid":
          let AuctionId = element.returnValues.auctionID;
          let Bid = element.returnValues.bid;
          let bidder = element.returnValues.winner;

          await auctionModel.updateMany(
            { auctionId: AuctionId },
            {
              $push: {
                "englishAuctionAttribute.bids": [
                  {
                    address: bidder,
                    bid: Bid,
                  },
                ],
                bidders: bidder,
              },
            }
          );
          const seentxBid = new seenTransactionModel({
            transactionHash: element.transactionHash,
            blockNumber: element.blockNumber,
            eventLog: element,
            state: "APPLIED",
          });
          await seentxBid.save();
          break;
        case "AuctionComplete":
          await auctionModel.updateMany(
            { auctionId: element.returnValues.auctionID },
            {
              $set: {
                "englishAuctionAttribute.winning_bid":
                  element.returnValues.winningBid,
              },
              buyer: element.returnValues.winner,
              state: "SUCCESSFULLY-COMPLETED",
            }
          );
          const seentxComplete = new seenTransactionModel({
            transactionHash: element.transactionHash,
            blockNumber: element.blockNumber,
            eventLog: element,
            state: "APPLIED",
          });
          await seentxComplete.save();
          break;
        case "AuctionCancel":
          await auctionModel.updateOne(
            { auctionId: element.returnValues.auctionID },
            {
              state: "CANCELLED",
            }
          );
          const seentxCancel = new seenTransactionModel({
            transactionHash: element.transactionHash,
            blockNumber: element.blockNumber,
            eventLog: element,
            state: "APPLIED",
          });
          await seentxCancel.save();
        default:
          break;
      }
    }
    const resp = await lastSeenBlocksModel.findOneAndUpdate(
      {},
      { blockNumberEnglish: toBlock },
      { new: true }
    );
    await resp.save();
  } catch (error) {
    console.error(error);
  } finally {
    processing = false;
  }
};

async function _createAuction(
  txHash,
  EventLog,
  auctionID,
  auctionOwner,
  auctiontype,
  tokenID,
  tokenContractAddress,
  startTime,
  endTime
) {
  const dbAuction = new auctionModel({
    auctionId: auctionID,
    seller: auctionOwner,
    state: "NOT-STARTED",
    auctionType: auctiontype,
    assetTokenId: tokenID,
    tokenContract: tokenContractAddress,
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
    transactionHash: EventLog.transactionHash,
    blockNumber: EventLog.blockNumber,
    eventLog: EventLog,
    state: "APPLIED",
  });
  await seentx.save();
  await utils.createAsset(txHash, auctionOwner);
}
async function _configureAuction(
  element,
  auctionId,
  openingPriceDecode,
  startTimestamp,
  endTimestamp,
  minIncrementDecode,
  softcloseduration,
  buyOutPrice
) {
  await auctionModel.updateOne(
    { auctionId: auctionId },
    {
      englishAuctionAttribute: {
        opening_price: openingPriceDecode,
        min_increment: minIncrementDecode,
        start_timestamp: startTimestamp * 1000,
        end_timestamp: endTimestamp * 1000,
        start_datetime: new Date(startTimestamp * 1000),
        end_datetime: new Date(endTimestamp * 1000),
        soft_close_duration: softcloseduration,
        buyout_price: buyOutPrice,
        winning_bid: 0,
      },
      state: "ONGOING",
    }
  );
  const seentxConfigure = new seenTransactionModel({
    transactionHash: element.transactionHash,
    blockNumber: element.blockNumber,
    eventLog: element,
    state: "APPLIED",
  });
  await seentxConfigure.save();
}

async function _placeBid(element, auctionId, bidder, Bid) {
  await auctionModel.updateMany(
    { auctionId: auctionId },
    {
      $push: {
        "englishAuctionAttribute.bids": [
          {
            address: bidder,
            bid: Bid,
          },
        ],
        bidders: bidder,
      },
    }
  );
  const seentxBid = new seenTransactionModel({
    transactionHash: element.transactionHash,
    blockNumber: element.blockNumber,
    eventLog: element,
    state: "APPLIED",
  });
  await seentxBid.save();
}

async function _auctionComplete(element) {
  await auctionModel.updateMany(
    { auctionId: element.returnValues.auctionID },
    {
      $set: {
        "englishAuctionAttribute.winning_bid": element.returnValues.winningBid,
      },
      buyer: element.returnValues.winner,
      state: "SUCCESSFULLY-COMPLETED",
    }
  );
  const seentxComplete = new seenTransactionModel({
    transactionHash: element.transactionHash,
    blockNumber: element.blockNumber,
    eventLog: element,
    state: "APPLIED",
  });
  await seentxComplete.save();
}

async function _cancelAuction(element) {
  await auctionModel.updateOne(
    { auctionId: element.returnValues.auctionID },
    {
      state: "CANCELLED",
    }
  );
  const seentxCancel = new seenTransactionModel({
    transactionHash: element.transactionHash,
    blockNumber: element.blockNumber,
    eventLog: element,
    state: "APPLIED",
  });
  await seentxCancel.save();
}
module.exports = {
  EnglishCreateAuctionEventSubscription,
  EnglishConfigureAuctionEventSubscription,
  EnglishPlaceBidEventSubscription,
  EnglishAuctionCancelEventSubscription,
  EnglishAuctionEndEventSubscription,
  EnglishAuctionCompleteEventSubscription,
  scrapeEnglishAuctionEventLogs,
  initScrapeEnglishAuctionEventLogs
};
