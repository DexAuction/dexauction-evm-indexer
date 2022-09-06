const res = require("express/lib/response");
const Web3 = require("web3");
const config = require("../config");
const web3 = new Web3(config.NETWORK_CONFIG.WS_NETWORK_URL);
const seenTransactionModel = require("../models/seenTransaction");
const NFTContractsModel = require("../models/NFT_contracts");
const { createAssetHelper } = require("../helper/utils");
const req = require("express/lib/request");
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
      
      const nftContracts = await NFTContractsModel.find();
      const found = nftContracts.filter(function (item) {
        return item.tokenContract === result.address;
      });
      if (
        !err &&
        found[0] &&
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
        const NFTContractInstance = new web3.eth.Contract(
          JSON.parse(found[0].abi),
          found[0].tokenContract
        );
        _createAsset(result, tokenId, recipient, found[0], NFTContractInstance);
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
    let promises = [];

    const nftContracts = await NFTContractsModel.find();
    for (item of nftContracts) {
      const NFTContractInstance = new web3.eth.Contract(
        JSON.parse(item.abi),
        item.tokenContract
      );
      const last_seen_block = item.lastSeenBlock;
      let from_Block = parseInt(last_seen_block) + 1 + "";
      let to_Block;
      const latestBlockNumber = await web3.eth.getBlockNumber();
      if (latestBlockNumber > config.CONFIRMATION_COUNT) {
        to_Block = latestBlockNumber - config.CONFIRMATION_COUNT + "";
      } else {
        to_Block = from_Block;
      }
      if (from_Block <= to_Block) {
        const allEventLogs = await NFTContractInstance.getPastEvents(
          "allEvents",
          {
            fromBlock: from_Block,
            toBlock: to_Block,
          }
        );
        console.log("allEventLogs ", allEventLogs);
        for (element of allEventLogs) {
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
                      element.returnValues.to,
                      item,
                      NFTContractInstance
                    )
                  );
                }

                break;
              default:
                break;
            }
          }
        }
        const resp = await NFTContractsModel.findOneAndUpdate(
          { tokenContract: item.tokenContract },
          {
            lastSeenBlock: to_Block,
          },
          { new: true }
        );
        await resp.save();
      }
    }
    await Promise.all(promises);
  } catch (error) {
    console.log(error);
  } finally {
    processing = false;
  }
};

// Initialize scraping NFT transfer event logs

const initScrapeNftContractEventLogs = async function (nftContracts) {
  try {
    console.log("Initializing NFT contract event logs...");
    // Start from block next to the last seen block till the (latestBlock - CONFIRMATION_COUNT)
    for (item of nftContracts) {
      const NFTContractInstance = new web3.eth.Contract(
        JSON.parse(item.abi),
        item.tokenContract
      );
      const last_seen_block = item.lastSeenBlock;
      let from_Block = parseInt(last_seen_block) + 1 + "";
      let to_Block;
      const latestBlockNumber = await web3.eth.getBlockNumber();
      if (latestBlockNumber > config.CONFIRMATION_COUNT) {
        to_Block = latestBlockNumber - config.CONFIRMATION_COUNT + "";
      } else {
        to_Block = from_Block;
      }

      if (from_Block <= to_Block) {
        const allEventLogs = await NFTContractInstance.getPastEvents(
          "allEvents",
          {
            fromBlock: from_Block,
            toBlock: to_Block,
          }
        );
        console.log("Init allEventLogs ", allEventLogs);
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
            case "Transfer":
              if (
                element.returnValues.from ==
                "0x0000000000000000000000000000000000000000"
              ) {
                _createAsset(
                  element,
                  element.returnValues.tokenId,
                  element.returnValues.to,
                  item,
                  NFTContractInstance
                );
              }

              break;
            default:
              break;
          }
        }
        const resp = await NFTContractsModel.findOneAndUpdate(
          { tokenContract: item.tokenContract },
          {
            lastSeenBlock: to_Block,
          },
          { new: true }
        );
        await resp.save();
      }
    }
    initialised = true;
  } catch (error) {
    console.log(error);
  }
};

async function _createAsset(
  EventLog,
  tokenId,
  assetOwner,
  NFTContract,
  NFTContractInstance
) {
  const seentx = new seenTransactionModel({
    transactionHash: EventLog.transactionHash,
    blockNumber: EventLog.blockNumber,
    eventLog: EventLog,
    state: "APPLIED",
  });
  await seentx.save();
  createAssetHelper(
    EventLog,
    tokenId,
    assetOwner,
    NFTContract,
    NFTContractInstance
  );
}

module.exports = {
  NftTransferEventSubscription,
  scrapeNftContractEventLogs,
  initScrapeNftContractEventLogs,
};
