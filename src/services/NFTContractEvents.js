const res = require("express/lib/response");
const Web3 = require("web3");
const config = require("../config");
const web3 = new Web3(config.NETWORK_CONFIG.WS_NETWORK_URL);
const lastSeenBlocksModel = require("../models/last_seen_blocks");
const seenTransactionModel = require("../models/seenTransaction");
const {
  DECENTRALAND_NFT_CONTRACT_ABI,
  ENS_NFT_CONTRACT_ABI,
} = require("../abi");
const { createAsset } = require("../helper/utils");

const DecentralandAssetContract = new web3.eth.Contract(
  DECENTRALAND_NFT_CONTRACT_ABI,
  config.NETWORK_CONFIG.DECENTRALAND_NFT_CONTRACT_ADDRESS
);
const ENSAssetContract = new web3.eth.Contract(
  ENS_NFT_CONTRACT_ABI,
  config.NETWORK_CONFIG.ENS_NFT_CONTRACT_ADDRESS
);
const NftTransferEventSubscription = async function () {
  await updateLastSyncedBlock();

  let recipient;
  let tokenId;
  let transactionHash;

  const subscribingNftTransfer = await web3.eth.subscribe(
    "logs",
    {
      address: [
        config.NETWORK_CONFIG.DECENTRALAND_NFT_CONTRACT_ADDRESS.toLowerCase(),
        config.NETWORK_CONFIG.ENS_NFT_CONTRACT_ADDRESS.toLowerCase(),
      ],
    },

    async function (err, result) {
      if (
        !err &&
        (result.address.toLowerCase() ===
          config.NETWORK_CONFIG.DECENTRALAND_NFT_CONTRACT_ADDRESS.toLowerCase() ||
          result.address.toLowerCase() ===
            config.NETWORK_CONFIG.ENS_NFT_CONTRACT_ADDRESS.toLowerCase()) &&
        result.topics[1] ===
          "0x0000000000000000000000000000000000000000000000000000000000000000"
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

        recipient = web3.eth.abi.decodeParameter("address", result.topics[2]);

        tokenId = web3.eth.abi.decodeParameter("uint256", result.topics[3]);

        // save in database
        _createAsset(result, tokenId, recipient);
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
    console.log(processing, initialised);
    if (processing || !initialised) {
      return;
    }
    processing = true;
    console.log("Scraping NFT contract event logs...");
    const lastSeenBlockRes = await lastSeenBlocksModel.findOne();

    const lastSeenBlockDecentraland =
      lastSeenBlockRes.blockNumberDecentralandNFT;
    const lastSeenBlockENS = lastSeenBlockRes.blockNumberENSNFT;
    // Start from block next to the last seen block till the (latestBlock - CONFIRMATION_COUNT)
    let fromBlockDecentraland = parseInt(lastSeenBlockDecentraland) + 1 + "";
    let fromBlockENS = parseInt(lastSeenBlockENS) + 1 + "";
    const latestBlockNumber = await web3.eth.getBlockNumber();
    let toBlockDecentraland;
    let toBlockENS;
    if (latestBlockNumber > config.CONFIRMATION_COUNT) {
      toBlockDecentraland = latestBlockNumber - config.CONFIRMATION_COUNT + "";
      toBlockENS = latestBlockNumber - config.CONFIRMATION_COUNT + "";
    } else {
      toBlockDecentraland = fromBlockDecentraland;
      toBlockENS = fromBlockENS;
    }
    let promises = [];
    if (fromBlockDecentraland <= toBlockDecentraland) {
      const allEventLogsDecentraland =
        await DecentralandAssetContract.getPastEvents("allEvents", {
          fromBlock: fromBlockDecentraland,
          toBlock: toBlockDecentraland,
        });
      console.log("allEventLogs Decentraland", allEventLogsDecentraland);
      for (element of allEventLogsDecentraland) {
        if (
          (element.returnValues.from =
            "0x0000000000000000000000000000000000000000")
        ) {
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
            case "Transfer":
              promises.push(
                _createAsset(
                  element,
                  element.returnValues.tokenId,
                  element.returnValues.to
                )
              );
              break;
            default:
              break;
          }
        }
      }
    }
    if (fromBlockENS <= toBlockENS) {
      const allEventLogsENS = await ENSAssetContract.getPastEvents(
        "allEvents",
        {
          fromBlock: fromBlockENS,
          toBlock: toBlockENS,
        }
      );
      console.log("allEventLogs ENS", allEventLogsENS);

      for (element of allEventLogsENS) {
        if (
          (element.returnValues.from =
            "0x0000000000000000000000000000000000000000")
        ) {
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
            case "Transfer":
              if (
                element.returnValues.from ==
                "0x0000000000000000000000000000000000000000"
              ) {
                promises.push(
                  _createAsset(
                    element,
                    element.returnValues.tokenId,
                    element.returnValues.to
                  )
                );
              }

              break;
            default:
              break;
          }
        }
      }
    }

    await Promise.all(promises);
    const resp = await lastSeenBlocksModel.findOneAndUpdate(
      {},
      {
        blockNumberDecentralandNFT: toBlockDecentraland,
        blockNumberENSNFT: toBlockENS,
      },
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

    const lastSeenBlockDecentraland =
      lastSeenBlockRes.blockNumberDecentralandNFT;
    const lastSeenBlockENS = lastSeenBlockRes.blockNumberENSNFT;

    // Start from block next to the last seen block till the (latestBlock - CONFIRMATION_COUNT)
    let fromBlockDecentraland = parseInt(lastSeenBlockDecentraland) + 1 + "";
    let fromBlockENS = parseInt(lastSeenBlockENS) + 1 + "";
    const latestBlockNumber = await web3.eth.getBlockNumber();
    let toBlockDecentraland;
    let toBlockENS;

    if (latestBlockNumber > config.CONFIRMATION_COUNT) {
      toBlockDecentraland = latestBlockNumber - config.CONFIRMATION_COUNT + "";
      toBlockENS = latestBlockNumber - config.CONFIRMATION_COUNT + "";
    } else {
      toBlockDecentraland = fromBlockDecentraland;
      toBlockENS = fromBlockENS;
    }

    if (fromBlockDecentraland <= toBlockDecentraland) {
      const allEventLogsDecentraland =
        await DecentralandAssetContract.getPastEvents("allEvents", {
          fromBlock: fromBlockDecentraland,
          toBlock: toBlockDecentraland,
        });
      console.log(" Init allEventLogs Decentraland ", allEventLogsDecentraland);
      for (element of allEventLogsDecentraland) {
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
          case "Transfer":
            // if coniditon is required here so that it will not pick transfer event emitted through approval of change ownership before
            // creating auction of this tokenId and only picks the transfer emitted while minting
            if (
              element.returnValues.from ==
              "0x0000000000000000000000000000000000000000"
            ) {
              _createAsset(
                element,
                element.returnValues.tokenId,
                element.returnValues.to
              );
            }

            break;
          default:
            break;
        }
      }
    }
    if (fromBlockENS <= toBlockENS) {
      const allEventLogsENS = await ENSAssetContract.getPastEvents(
        "allEvents",
        {
          fromBlock: fromBlockENS,
          toBlock: toBlockENS,
        }
      );
      console.log("Init allEventLogs ENS", allEventLogsENS);
      for (element of allEventLogsENS) {
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
          case "Transfer":
            _createAsset(
              element,
              element.returnValues.tokenId,
              element.returnValues.to
            );
            break;
          default:
            break;
        }
      }
    }

    const resp = await lastSeenBlocksModel.findOneAndUpdate(
      {},
      {
        blockNumberDecentralandNFT: toBlockDecentraland,
        blockNumberENSNFT: toBlockENS,
      },
      { new: true }
    );
    await resp.save();
    initialised = true;
  } catch (error) {
    console.log(error);
  }
};

async function _createAsset(EventLog, tokenId, assetOwner) {
  const seentx = new seenTransactionModel({
    transactionHash: EventLog.transactionHash,
    blockNumber: EventLog.blockNumber,
    eventLog: EventLog,
    state: "APPLIED",
  });
  await seentx.save();
  createAsset(EventLog, tokenId, assetOwner);
}

module.exports = {
  NftTransferEventSubscription,
  scrapeNftContractEventLogs,
  initScrapeNftContractEventLogs,
};
