const res = require("express/lib/response");
const Web3 = require("web3");
const config = require("../config");
const web3 = new Web3(config.NETWORK_CONFIG.WS_NETWORK_URL);
const seenTransactionModel = require("../models/seenTransaction");
const NFTContractsModel = require("../models/NFT_contracts");
const collectionModel = require("../models/collections");
const { createAssetHelper, mintAssetHistoryHelper } = require("../helper/utils");
const req = require("express/lib/request");
const {
  DECENTRALAND_NFT_CONTRACT_ABI,
  ERC1155_NFT_CONTRACT_ABI
} = require('../abi');

const NftTransferEventSubscription = async function () {
  await updateLastSyncedBlock();

  // Subscribing ERC721 Nft Transfer event 
  await web3.eth.subscribe(
    "logs",
    {
      address: [
        config.NETWORK_CONFIG.DECENTRALAND_NFT_CONTRACT_ADDRESS.toLowerCase(),
        config.NETWORK_CONFIG.ENS_NFT_CONTRACT_ADDRESS.toLowerCase(),
      ],
    },
    async function (err, result) {
      const nftContract = await NFTContractsModel.findOne({tokenContract: result.address});
      if (
        !err &&
        nftContract &&
        result.topics[0] === config.EVENT_TOPIC_SIGNATURES.ERC721_TRANSFER
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

        console.log(`decoding ${DECENTRALAND_NFT_CONTRACT_ABI[3]['name']} eventLogs`);
        const decodedData = web3.eth.abi.decodeLog(
          DECENTRALAND_NFT_CONTRACT_ABI[3]['inputs'], 
          result.data, 
          result.topics.slice(1)
        );

        if(decodedData.from === config.ZERO_ADDRESS) {
          // save in database
          const NFTContractInstance = new web3.eth.Contract(
            JSON.parse(nftContract.abi),
            nftContract.tokenContract
          );
          const dbCollection = await collectionModel.findOne({
            contractAddress: nftContract.tokenContract
          });

          await _createAsset(
            result,
            decodedData.tokenId,
            1,
            decodedData.to,
            decodedData.to,
            nftContract,
            NFTContractInstance,
            dbCollection
          );
        }
      }
    }
  );
};

const ERC1155NftTransferEventSubscription = async function () {
  await updateLastSyncedBlock();

  // Subscribing ERC1155 TransferSingle event
  await web3.eth.subscribe(
    'logs',
    {
      address: config.NETWORK_CONFIG.ERC1155_NFT_CONTRACT_ADDRESS.toLowerCase(),
    },
    async function (err, result) {
      const nftContract = await NFTContractsModel.findOne({tokenContract: result.address});
      if (
        !err &&
        nftContract &&
        result.topics[0] === config.EVENT_TOPIC_SIGNATURES.ERC1155_TRANSFER_SINGLE
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

        console.log(`decoding ${ERC1155_NFT_CONTRACT_ABI[3]['name']} eventLogs`);
        const decodedData = web3.eth.abi.decodeLog(
          ERC1155_NFT_CONTRACT_ABI[3]['inputs'], 
          result.data, 
          result.topics.slice(1)
        );

        if(decodedData.from === config.ZERO_ADDRESS) {
          // save in database
          const NFTContractInstance = new web3.eth.Contract(
            JSON.parse(nftContract.abi),
            nftContract.tokenContract
          );
          const dbCollection = await collectionModel.findOne({
            contractAddress: nftContract.tokenContract
          });
          await _createAsset(
            result, 
            decodedData.id,
            decodedData.value, 
            decodedData.to,
            decodedData.operator, 
            nftContract, 
            NFTContractInstance,
            dbCollection
          );
        }
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
    for (let nftContract of nftContracts) {
      const NFTContractInstance = new web3.eth.Contract(
        JSON.parse(nftContract.abi),
        nftContract.tokenContract
      );

      const dbCollection = await collectionModel.findOne({
        contractAddress: nftContract.tokenContract
      });

      const last_seen_block = nftContract.lastSeenBlock;
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
        for (let element of allEventLogs) {
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
                element.returnValues.from === config.ZERO_ADDRESS
              ) {
                promises.push(
                  _createAsset(
                    element,
                    element.returnValues.tokenId,
                    1,
                    element.returnValues.to,
                    element.returnValues.to,
                    nftContract,
                    NFTContractInstance,
                    dbCollection
                  )
                );
              }
              break;

              case 'TransferSingle':
                if (
                  element.returnValues.from === config.ZERO_ADDRESS
                ) {
                  promises.push(
                    _createAsset(
                      element, 
                      element.returnValues.id,
                      element.returnValues.value, 
                      element.returnValues.to,
                      element.returnValues.operator, 
                      nftContract, 
                      NFTContractInstance,
                      dbCollection
                    )
                  );
                }
                break;

            default:
              break;
          }
        }
        const resp = await NFTContractsModel.findOneAndUpdate(
          { tokenContract: nftContract.tokenContract },
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
    for (let nftContract of nftContracts) {
      const NFTContractInstance = new web3.eth.Contract(
        JSON.parse(nftContract.abi),
        nftContract.tokenContract
      );
      const dbCollection = await collectionModel.findOne({
        contractAddress: nftContract.tokenContract
      });
      const last_seen_block = nftContract.lastSeenBlock;
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
        for (let element of allEventLogs) {
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
                element.returnValues.from == config.ZERO_ADDRESS
              ) {
                await _createAsset(
                  element,
                  element.returnValues.tokenId,
                  1,
                  element.returnValues.to,
                  element.returnValues.to,
                  nftContract,
                  NFTContractInstance,
                  dbCollection
                );
              }
              break;

            case 'TransferSingle':
              if (
                element.returnValues.from === config.ZERO_ADDRESS
              ) {
                await _createAsset(
                  element, 
                  element.returnValues.id,
                  element.returnValues.value, 
                  element.returnValues.to,
                  element.returnValues.operator, 
                  nftContract, 
                  NFTContractInstance,
                  dbCollection
                )
              }
              break;

            default:
              break;
          }
        }
        const resp = await NFTContractsModel.findOneAndUpdate(
          { tokenContract: nftContract.tokenContract },
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
  eventLog,
  tokenId,
  quantity,
  assetOwner,
  assetMintedBy,
  NFTContract,
  NFTContractInstance,
  dbCollection
) {
  const assetId = await createAssetHelper(
    tokenId,
    quantity,
    assetOwner,
    assetMintedBy,
    NFTContract,
    NFTContractInstance,
    dbCollection
  );
  
  await mintAssetHistoryHelper(eventLog, assetId, quantity);

  const seentx = new seenTransactionModel({
    transactionHash: eventLog.transactionHash,
    blockNumber: eventLog.blockNumber,
    eventLog: eventLog,
    state: "APPLIED",
  });
  await seentx.save();
}

module.exports = {
  NftTransferEventSubscription,
  ERC1155NftTransferEventSubscription,
  scrapeNftContractEventLogs,
  initScrapeNftContractEventLogs,
};
