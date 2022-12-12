const Web3 = require('web3');
const config = require('../config');
const web3 = new Web3(config.NETWORK_CONFIG.WS_NETWORK_URL);
const seenTransactionModel = require('../models/seen_transaction');
const NFTContractsModel = require('../models/nft_contracts');
const collectionModel = require('../models/collections');
const {
  createAssetHelper,
  mintAssetHistoryHelper,
} = require('../helper/utils');
const { ERC721_NFT_CONTRACT_ABI, ERC1155_NFT_CONTRACT_ABI } = require('../abi');
const { ZERO_ADDRESS } = require('../constants');

const NftTransferEventSubscription = async function () {
  await updateLastSyncedBlock();

  // Subscribing ERC721 Nft Transfer event
  await web3.eth.subscribe(
    'logs',
    {
      address: [
        config.NETWORK_CONFIG.MYNEERC721_NFT_CONTRACT_ADDRESS.toLowerCase(),
      ],
    },
    async function (err, result) {
      const nftContract = await NFTContractsModel.findOne({
        contractAddress: result.address,
      });
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
            `transaction already applied with transaction hash ${result.transactionHash}`,
          );
          return;
        }

        console.log(
          `decoding ERC721 ${ERC721_NFT_CONTRACT_ABI[3]['name']} eventLogs in NFTEvents`,
        );
        const decodedData = web3.eth.abi.decodeLog(
          ERC721_NFT_CONTRACT_ABI[3]['inputs'],
          result.data,
          result.topics.slice(1),
        );

        console.log('from: ', decodedData.from);
        if (decodedData.from === ZERO_ADDRESS) {
          // save in database
          const NFTContractInstance = new web3.eth.Contract(
            JSON.parse(nftContract.abi),
            nftContract.contractAddress,
          );
          const dbCollection = await collectionModel.findOne({
            contractAddress: nftContract.contractAddress,
          });

          await _createAsset(
            result,
            decodedData.tokenId,
            1,
            decodedData.to,
            decodedData.to,
            NFTContractInstance,
            dbCollection,
          );
        }
      }
    },
  );
};

const ERC1155NftTransferEventSubscription = async function () {
  await updateLastSyncedBlock();

  // Subscribing ERC1155 TransferSingle event
  await web3.eth.subscribe(
    'logs',
    {
      address:
        config.NETWORK_CONFIG.MYNEERC1155_NFT_CONTRACT_ADDRESS.toLowerCase(),
    },
    async function (err, result) {
      const nftContract = await NFTContractsModel.findOne({
        contractAddress: result.address,
      });
      if (
        !err &&
        nftContract &&
        result.topics[0] ===
          config.EVENT_TOPIC_SIGNATURES.ERC1155_TRANSFER_SINGLE
      ) {
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
          `decoding ERC1155 ${ERC1155_NFT_CONTRACT_ABI[4]['name']} eventLogs in NFTEvents`,
        );
        const decodedData = web3.eth.abi.decodeLog(
          ERC1155_NFT_CONTRACT_ABI[4]['inputs'],
          result.data,
          result.topics.slice(1),
        );

        console.log('from: ', decodedData.from);
        if (decodedData.from === ZERO_ADDRESS) {
          // save in database
          const NFTContractInstance = new web3.eth.Contract(
            JSON.parse(nftContract.abi),
            nftContract.contractAddress,
          );
          const dbCollection = await collectionModel.findOne({
            contractAddress: nftContract.contractAddress,
          });
          await _createAsset(
            result,
            decodedData.id,
            decodedData.value,
            decodedData.to,
            decodedData.operator,
            NFTContractInstance,
            dbCollection,
          );
        }
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

const scrapeNftContractEventLogs = async function () {
  try {
    if (processing || !initialised) {
      return;
    }
    processing = true;
    console.log('Scraping NFT contract event logs...');
    let promises = [];

    const nftContracts = await NFTContractsModel.find();
    for (let nftContract of nftContracts) {
      const NFTContractInstance = new web3.eth.Contract(
        JSON.parse(nftContract.abi),
        nftContract.contractAddress,
      );

      const dbCollection = await collectionModel.findOne({
        contractAddress: nftContract.contractAddress,
      });

      const lastSeenBlock = nftContract.lastSeenBlock;
      let fromBlock = parseInt(lastSeenBlock) + 1 + '';
      let toBlock;
      const latestBlockNumber = await web3.eth.getBlockNumber();
      if (latestBlockNumber > config.CONFIRMATION_COUNT) {
        toBlock = latestBlockNumber - config.CONFIRMATION_COUNT + '';
      } else {
        toBlock = fromBlock;
      }

      if (fromBlock <= toBlock) {
        const allEventLogs = await NFTContractInstance.getPastEvents(
          'allEvents',
          {
            fromBlock: fromBlock,
            toBlock: toBlock,
          },
        );
        console.log('allEventLogs ', allEventLogs);
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
            case 'Transfer':
              if (element.returnValues.from === ZERO_ADDRESS) {
                promises.push(
                  _createAsset(
                    element,
                    element.returnValues.tokenId,
                    1,
                    element.returnValues.to,
                    element.returnValues.to,
                    NFTContractInstance,
                    dbCollection,
                  ),
                );
              }
              break;

            case 'TransferSingle':
              if (element.returnValues.from === ZERO_ADDRESS) {
                promises.push(
                  _createAsset(
                    element,
                    element.returnValues.id,
                    element.returnValues.value,
                    element.returnValues.to,
                    element.returnValues.operator,
                    NFTContractInstance,
                    dbCollection,
                  ),
                );
              }
              break;

            default:
              break;
          }
        }
        const resp = await NFTContractsModel.findOneAndUpdate(
          { contractAddress: nftContract.contractAddress },
          {
            lastSeenBlock: toBlock,
          },
          { new: true },
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
    console.log('Initializing NFT contract event logs...');
    // Start from block next to the last seen block till the (latestBlock - CONFIRMATION_COUNT)
    for (let nftContract of nftContracts) {
      const NFTContractInstance = new web3.eth.Contract(
        JSON.parse(nftContract.abi),
        nftContract.contractAddress,
      );
      const dbCollection = await collectionModel.findOne({
        contractAddress: nftContract.contractAddress,
      });
      const lastSeenBlock = nftContract.lastSeenBlock;
      let fromBlock = parseInt(lastSeenBlock) + 1 + '';
      let toBlock;
      const latestBlockNumber = await web3.eth.getBlockNumber();
      if (latestBlockNumber > config.CONFIRMATION_COUNT) {
        toBlock = latestBlockNumber - config.CONFIRMATION_COUNT + '';
      } else {
        toBlock = fromBlock;
      }

      if (fromBlock <= toBlock) {
        const allEventLogs = await NFTContractInstance.getPastEvents(
          'allEvents',
          {
            fromBlock: fromBlock,
            toBlock: toBlock,
          },
        );
        console.log('Init allEventLogs ', allEventLogs);
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
            case 'Transfer':
              if (element.returnValues.from === ZERO_ADDRESS) {
                await _createAsset(
                  element,
                  element.returnValues.tokenId,
                  1,
                  element.returnValues.to,
                  element.returnValues.to,
                  NFTContractInstance,
                  dbCollection,
                );
              }
              break;

            case 'TransferSingle':
              if (element.returnValues.from === ZERO_ADDRESS) {
                await _createAsset(
                  element,
                  element.returnValues.id,
                  element.returnValues.value,
                  element.returnValues.to,
                  element.returnValues.operator,
                  NFTContractInstance,
                  dbCollection,
                );
              }
              break;

            default:
              break;
          }
        }
        const resp = await NFTContractsModel.findOneAndUpdate(
          { contractAddress: nftContract.contractAddress },
          {
            lastSeenBlock: toBlock,
          },
          { new: true },
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
  NFTContractInstance,
  dbCollection,
) {
  const dbAsset = await createAssetHelper(
    tokenId,
    quantity,
    assetOwner,
    assetMintedBy,
    NFTContractInstance,
    dbCollection,
  );

  await mintAssetHistoryHelper(eventLog, dbAsset, quantity);

  const seentx = new seenTransactionModel({
    transactionHash: eventLog.transactionHash,
    blockNumber: eventLog.blockNumber,
    eventLog: eventLog,
    state: 'APPLIED',
  });
  await seentx.save();
}

module.exports = {
  NftTransferEventSubscription,
  ERC1155NftTransferEventSubscription,
  scrapeNftContractEventLogs,
  initScrapeNftContractEventLogs,
};
