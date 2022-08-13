const res = require("express/lib/response");
const Web3 = require("web3");
const config = require("../config");
const web3 = new Web3(config.NETWORK_CONFIG.WS_NETWORK_URL);
const assetModel = require("../models/asset");
const lastSeenBlocksModel = require("../models/last_seen_blocks");
const seenTransactionModel = require("../models/seenTransaction");
const { DECENTRALAND_NFT_CONTRACT_ABI, PROXY_AUCTION_ABI } = require("../abi");
const utils = require("../helper/utils");
const NFTContract = new web3.eth.Contract(
  DECENTRALAND_NFT_CONTRACT_ABI,
  config.NETWORK_CONFIG.DECENTRALAND_NFT_CONTRACT_ADDRESS
);

const NftTransferEventSubscription = async function () {
    await updateLastSyncedBlock();

    let recipient;
    let tokenId;
    let transactionHash;

    const subscribingNftTransfer = await web3.eth.subscribe(
        "logs",
        {
            address: config.NETWORK_CONFIG.DECENTRALAND_NFT_CONTRACT_ADDRESS.toLowerCase(),
        },

        async function(err, result) {
            if (
            !err &&
            result.address.toLowerCase() ===
                config.NETWORK_CONFIG.DECENTRALAND_NFT_CONTRACT_ADDRESS.toLowerCase() &&
            result.topics[1] === "0"   
            ) {
                const seenTx = await seenTransactionModel.findOne({
                    transactionHash: result.transactionHash,
                });
                if (seenTx) {
                  console.log(
                    `transaction already applied with transaction hash ${result.transactionHash}`
                  );
                  return;
                }

                transactionHash = result.transactionHash;

                recipient = web3.eth.abi.decodeParameter(
                    "address",
                    result.topics[2]
                );

                tokenId = web3.eth.abi.decodeParameter(
                    "uint256",
                    result.topics[3]
                );

                // save in database
                _createAsset(
                    transactionHash,
                    result,
                    tokenId,
                    recipient,
                )
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
let initialised = false;

const scrapeNftContractEventLogs = async function () {
    try {
      if (processing || !initialised) {
      return;
    }
    processing = true;
    console.log("Scraping NFT contract event logs...");
    const lastSeenBlockRes = await lastSeenBlocksModel.findOne();

    const lastSeenBlock = lastSeenBlockRes.blockNumberNFT;

    // Start from block next to the last seen block till the (latestBlock - CONFIRMATION_COUNT)
    const fromBlock = parseInt(lastSeenBlock) + 1 + "";
    const latestBlockNumber = await web3.eth.getBlockNumber();
    let toBlock;
    if (latestBlockNumber > config.CONFIRMATION_COUNT) {
      toBlock = latestBlockNumber - config.CONFIRMATION_COUNT + "";
    } else {
      toBlock = fromBlock;
    }

    const allEventLogs = await NFTContract.getPastEvents(
      "allEvents",
      {
        fromBlock,
        toBlock,
      }
    );
      
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
      switch(element.event) {
        case "Transfer":

          promise.push(
            utils.createAsset(
              element.transactionHash,
              element.returnValues.newOwner
            )
          );
          break;
          default:
          break;
      }
    } 
    await Promise.all(promises);
    const resp = await lastSeenBlocksModel.findOneAndUpdate(
      {},
      { blockNumberNFT: toBlock },
      { new: true }
    );
    await resp.save();
  } catch (error) {
    console.log(error);
  } finally {
    processing = false;
  }
};

// Initialize scraping NFT transfer event logs 

const initScrapeNftContractEventLogs = async function (lastSeenBlockRes) {
    try {
    console.log("Initializing NFT contract event logs...");

    const lastSeenBlock = lastSeenBlockRes.blockNumberNFT;

    // Start from block next to the last seen block till the (latestBlock - CONFIRMATION_COUNT)
    const fromBlock = parseInt(lastSeenBlock) + 1 + "";
    const latestBlockNumber = await web3.eth.getBlockNumber();
    let toBlock;
    if (latestBlockNumber > config.CONFIRMATION_COUNT) {
      toBlock = latestBlockNumber - config.CONFIRMATION_COUNT + "";
    } else {
      toBlock = fromBlock;
    }

    const allEventLogs = await NFTContract.getPastEvents(
      "allEvents",
      {
        fromBlock,
        toBlock,
      }
    );
      
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
      switch(element.event) {
        case "Transfer":
            
            utils.createAsset(
              element.transactionHash,
              element.returnValues.newOwner
            );
          break;
          default:
          break;
      }
    } 
    const resp = await lastSeenBlocksModel.findOneAndUpdate(
      {},
      { blockNumberNFT: toBlock },
      { new: true }
    );
    await resp.save();
    initialised = true;
  } catch (error) {
    console.log(error);
  } 
};

async function _createAsset(
    txHash,
    EventLog,
    tokenId,
    assetOwner
) {
    const dbAsset = new assetModel({
        assetTokenId: tokenId,
        owner: assetOwner,
    })
    await dbAsset.save();

    const seentx = new seenTransactionModel({
    transactionHash: EventLog.transactionHash,
    blockNumber: EventLog.blockNumber,
    eventLog: EventLog,
    state: "APPLIED",
  });
  await seentx.save();
  await utils.createAsset(txHash, owner);
}

module.exports = {
  NftTransferEventSubscription,
  scrapeNftContractEventLogs,
  initScrapeNftContractEventLogs
};