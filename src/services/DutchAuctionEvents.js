const Web3 = require("web3");
const config = require("../config");
const web3 = new Web3(config.NETWORK_CONFIG.WS_NETWORK_URL);
const auctionModel = require("../models/auction");
const lastSeenBlocksModel = require("../models/last_seen_blocks");
const seenTransactionModel = require("../models/seenTransaction");
const utils = require("../helper/utils");
const { DUTCH_CONTRACT_ABI, PROXY_AUCTION_ABI } = require("../abi");
const res = require("express/lib/response");

const DutchAuctionContract = new web3.eth.Contract(
  DUTCH_CONTRACT_ABI,
  config.NETWORK_CONFIG.DUTCH_CONTRACT_ADDRESS
);
const ProxyContract = new web3.eth.Contract(
  PROXY_AUCTION_ABI,
  config.NETWORK_CONFIG.PROXY_ADDRESS
);

const DutchCreateAuctionEventSubscription = async function () {
  await updateLastSyncedBlock();

  let auctionID;
  let auctionOwner;
  let startTimeDecode;
  const subscribingAuctionCreate = await web3.eth.subscribe(
    "logs",
    {
      address: config.NETWORK_CONFIG.DUTCH_CONTRACT_ADDRESS.toLowerCase(),
    },

    async function (err, result) {
      if (
        !err &&
        result.address.toLowerCase() ===
          config.NETWORK_CONFIG.DUTCH_CONTRACT_ADDRESS.toLowerCase() &&
        result.topics[0] ===
          "0xe793ffbd8d1d9749a0cdd9b308cea8716ce980a0fd4c6d3ff797fee30b6b8d36"
      ) {
        console.log("result 1", result);
        auctionID = web3.eth.abi.decodeParameter("uint256", result.topics[1]);
        auctionOwner = web3.eth.abi.decodeParameter(
          "address",
          result.topics[2]
        );
        startTimeDecode = web3.eth.abi.decodeParameter(
          "uint256",
          result.topics[3]
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
        console.log("result 2", result2);
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
        if (auctionTypeDecode == "dutch") {
          const seenTx = await seenTransactionModel.findOne({
            transactionHash: result2.transactionHash,
          });
          if (seenTx) {
            console.log(
              `transaction already applied , Transaction hash: ${result2.transactionHash}`
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
            startTimeDecode
          );
          console.log("syncedblock create Dutch", config.LAST_SYNCED_BLOCK);
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
    "logs",
    {
      address: config.NETWORK_CONFIG.DUTCH_CONTRACT_ADDRESS.toLowerCase(),
    },
    async function (err, result) {
      if (
        !err &&
        result.address.toLowerCase() ===
          config.NETWORK_CONFIG.DUTCH_CONTRACT_ADDRESS.toLowerCase() &&
        result.topics[0] ===
          "0x255ccde09f1e6a77a079ebaf1a0ccbc1818536941c520900a72cf02320212cad"
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

        const reservePriceHex = "0x" + result.data.substring(66, 130);
        reservePriceDecode = web3.eth.abi.decodeParameter(
          "uint256",
          reservePriceHex
        );

        const dropAmountHex = "0x" + result.data.substring(130, 194);
        dropAmountDecode = web3.eth.abi.decodeParameter(
          "uint256",
          dropAmountHex
        );
        const openingPriceHex = "0x" + result.data.substring(194, 258);
        openingPriceDecode = web3.eth.abi.decodeParameter(
          "uint256",
          openingPriceHex
        );
        const roundDurationHex = "0x" + result.data.substring(258, 322);
        roundDurationDecode = web3.eth.abi.decodeParameter(
          "uint256",
          roundDurationHex
        );

        await auctionModel.updateOne(
          { auctionId: auctionID },
          {
            dutchAuctionAttribute: {
              opening_price: openingPriceDecode,
              round_duration: roundDurationDecode,
              start_timestamp: startTimeDecode * 1000,
              start_datetime: new Date(startTimeDecode * 1000),
              reserve_price: reservePriceDecode,
              drop_amount: dropAmountDecode,
              winningBid: 0,
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

const DutchAcceptPriceEventSubscription = async function () {
  await updateLastSyncedBlock();
  await web3.eth.subscribe(
    "logs",
    {
      address: config.NETWORK_CONFIG.DUTCH_CONTRACT_ADDRESS.toLowerCase(),
    },
    async function (err, result) {
      if (
        !err &&
        result.address.toLowerCase() ===
          config.NETWORK_CONFIG.DUTCH_CONTRACT_ADDRESS.toLowerCase() &&
        result.topics[0] ===
          "0x62a3911748f292afd602f561751a05168762f64ee07098921650dba582fca0d6"
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
        const winningBid = web3.eth.abi.decodeParameter(
          "uint256",
          result.topics[2]
        );
        const auctionWinner = web3.eth.abi.decodeParameter(
          "address",
          result.topics[3]
        );
        await auctionModel.updateMany(
          { auctionId: auctionID },
          {
            $set: { "dutchAuctionAttribute.winning_bid": winningBid },
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
        console.log("syncedBlock bid", config.LAST_SYNCED_BLOCK);
      }
    }
  );
};

const DutchAuctionCancelEventSubscription = async function () {
  await updateLastSyncedBlock();
  await web3.eth.subscribe(
    "logs",
    {
      address: config.NETWORK_CONFIG.DUTCH_CONTRACT_ADDRESS.toLowerCase(),
    },
    async function (err, result) {
      if (
        !err &&
        result.address.toLowerCase() ===
          config.NETWORK_CONFIG.DUTCH_CONTRACT_ADDRESS.toLowerCase() &&
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

        await auctionModel.updateMany(
          { auctionId: auctionID },
          {
            $set: { "dutchAuctionAttribute.winning_bid": 0 },
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

async function updateLastSyncedBlock() {
  await web3.eth.subscribe("newBlockHeaders", async function (err, result) {
    if (!err) {
      config.LAST_SYNCED_BLOCK = result.number;
    }
  });
  return config.LAST_SYNCED_BLOCK;
}

let processing = false;

const scrapeDutchAuctionEventLogs = async function () {
  try {
    if (processing) {
      return;
    }
    processing = true;
    console.log("Scraping dutch auction event logs ...");
    const lastSeenBlockRes = await lastSeenBlocksModel.findOne();

    const lastSeenBlock = lastSeenBlockRes.blockNumberDutch;

    // Start from block next to the last seen block till the latestBlock
    const fromBlock = parseInt(lastSeenBlock) + 1 + "";
    const latestBlock = (await web3.eth.getBlockNumber()) + "";

    const allEventLogs = await DutchAuctionContract.getPastEvents("allEvents", {
      fromBlock,
      toBlock: latestBlock,
    });

    const allEventLogsProxy = await ProxyContract.getPastEvents("allEvents", {
      fromBlock,
      toBlock: latestBlock,
    });
    console.log("allEventLogsProxy Dutch", allEventLogsProxy);
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
              item.returnValues.auction_type == "dutch" &&
              item.transactionHash == element.transactionHash
            ) {
              console.log("Hi from Dutch");
              tokenContractAddress = item.returnValues.tokenContractAddress;
              tokenID = item.returnValues.tokenId;
              auctiontype = item.returnValues.auction_type;
            }
          }
          if (auctiontype == "dutch") {
            promises.push(
              _createAuction(
                element.transactionHash,
                element,
                element.returnValues.auctionId,
                element.returnValues.auctionOwner,
                auctiontype,
                tokenID,
                tokenContractAddress,
                element.returnValues.startTime
              )
            );
            break;
          }
        case "AuctionConfigure":
          let openingPriceDecode = element.returnValues.openingPrice;
          let reservePriceDecode = element.returnValues.reservePrice;
          let startTimestamp = element.returnValues.startTime;
          let dropAmount = element.returnValues.dropAmount;
          let roundDuration = element.returnValues.roundDuration;
          let auctionID = element.returnValues.auctionId;
          promises.push(
            _configureAuction(
              element,
              auctionID,
              openingPriceDecode,
              roundDuration,
              startTimestamp,
              reservePriceDecode,
              dropAmount
            )
          );
          break;
        case "PriceAccept":
          let AuctionId = element.returnValues.auctionId;
          let winBid = element.returnValues.winningBid;
          let auctionWinner = element.returnValues.winner;
          promises.push(
            _acceptPrice(element, AuctionId, winBid, auctionWinner)
          );

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
      { blockNumberDutch: latestBlock },
      { new: true }
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
    if (processing) {
      return;
    }
    processing = true;
    console.log("Scraping dutch auction event logs ...");
    //const lastSeenBlockRes = await lastSeenBlocksModel.findOne();

    const lastSeenBlock = lastSeenBlockRes.blockNumberDutch;

    // Start from block next to the last seen block till the (latestBlock - CONFIRMATION_COUNT)
    const fromBlock = parseInt(lastSeenBlock) + 1 + "";
    const latestBlockNumber = await web3.eth.getBlockNumber();
    let toBlock = 0;
    if (latestBlockNumber > config.CONFIRMATION_COUNT) {
      toBlock = latestBlockNumber - config.CONFIRMATION_COUNT + "";
    }

    const allEventLogs = await DutchAuctionContract.getPastEvents("allEvents", {
      fromBlock,
      toBlock: toBlock,
    });

    const allEventLogsProxy = await ProxyContract.getPastEvents("allEvents", {
      fromBlock,
      toBlock: toBlock,
    });

    console.log("allEventLogsProxy Dutch", allEventLogsProxy);
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
              item.returnValues.auction_type == "dutch" &&
              item.transactionHash == element.transactionHash
            ) {
              console.log("Hi from Dutch");
              tokenContractAddress = item.returnValues.tokenContractAddress;
              tokenID = item.returnValues.tokenId;
              auctiontype = item.returnValues.auction_type;
            }
          }
          if (auctiontype == "dutch") {
            _createAuction(
              element.transactionHash,
              element,
              element.returnValues.auctionId,
              element.returnValues.auctionOwner,
              auctiontype,
              tokenID,
              tokenContractAddress,
              element.returnValues.startTime
            );
            break;
          }
        case "AuctionConfigure":
          let openingPriceDecode = element.returnValues.openingPrice;
          let reservePriceDecode = element.returnValues.reservePrice;
          let startTimestamp = element.returnValues.startTime;
          let dropAmount = element.returnValues.dropAmount;
          let roundDuration = element.returnValues.roundDuration;
          let auctionID = element.returnValues.auctionId;

          await auctionModel.updateOne(
            { auctionId: auctionID },
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
        case "PriceAccept":
          let AuctionId = element.returnValues.auctionId;
          let winBid = element.returnValues.winningBid;
          let auctionWinner = element.returnValues.winner;
          await auctionModel.updateMany(
            { auctionId: AuctionId },
            {
              $set: { "dutchAuctionAttribute.winning_bid": winBid },
              buyer: auctionWinner,
              state: "SUCCESSFULLY-COMPLETED",
            }
          );
          const seentxPriceAccept = new seenTransactionModel({
            transactionHash: element.transactionHash,
            blockNumber: element.blockNumber,
            eventLog: element,
            state: "APPLIED",
          });
          await seentxPriceAccept.save();
          break;
        case "AuctionCancel":
          await auctionModel.updateOne(
            { auctionId: element.returnValues.auctionId },
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
      { blockNumberDutch: toBlock },
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
  startTime
) {
  const dbAuction = new auctionModel({
    auctionId: auctionID,
    seller: auctionOwner,
    state: "NOT-STARTED",
    auctionType: auctiontype,
    assetTokenId: tokenID,
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
  auctionID,
  openingPriceDecode,
  roundDuration,
  startTimestamp,
  reservePriceDecode,
  dropAmount
) {
  await auctionModel.updateOne(
    { auctionId: auctionID },
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
async function _acceptPrice(element, AuctionId, winBid, auctionWinner) {
  await auctionModel.updateMany(
    { auctionId: AuctionId },
    {
      $set: { "dutchAuctionAttribute.winning_bid": winBid },
      buyer: auctionWinner,
      state: "SUCCESSFULLY-COMPLETED",
    }
  );
  const seentxPriceAccept = new seenTransactionModel({
    transactionHash: element.transactionHash,
    blockNumber: element.blockNumber,
    eventLog: element,
    state: "APPLIED",
  });
  await seentxPriceAccept.save();
}

async function _cancelAuction(element) {
  await auctionModel.updateOne(
    { auctionId: element.returnValues.auctionId },
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
  DutchCreateAuctionEventSubscription,
  DutchConfigureAuctionEventSubscription,
  DutchAcceptPriceEventSubscription,
  DutchAuctionCancelEventSubscription,
  scrapeDutchAuctionEventLogs,
  initScrapeDutchAuctionEventLogs
};
