const Web3 = require('web3');
const config = require('../config');
const web3 = new Web3(config.NETWORK_CONFIG.WS_NETWORK_URL);
const seenTransactionModel = require('../models/seen_transaction');
const lastSeenBlocksModel = require('../models/last_seen_blocks');
const {
  createBasketHelper,
  destoryBasketHelper,
  basketCreateAssetHistoryHelper,
  basketDestroyAssetHistoryHelper,
} = require('../helper/utils');
const { PROXY_AUCTION_ABI } = require('../abi');

let ProxyContract = new web3.eth.Contract(
  PROXY_AUCTION_ABI,
  config.NETWORK_CONFIG.PROXY_ADDRESS,
);

const BasketCreateEventSubscription = async function () {
  await updateLastSyncedBlock();

  // Subscribing to BasketCreate event
  await web3.eth.subscribe(
    'logs',
    {
      address: [config.NETWORK_CONFIG.PROXY_ADDRESS.toLowerCase()],
    },

    async function (err, result) {
      if (
        !err &&
        result.address.toLowerCase() ===
          config.NETWORK_CONFIG.PROXY_ADDRESS.toLowerCase() &&
        result.topics[0] === config.EVENT_TOPIC_SIGNATURES.BASKET_CREATE
      ) {
        console.log('Result basket', result);
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
          `decoding ${PROXY_AUCTION_ABI[4]['name']} eventLogs in BasketEvents`,
        );
        const decodedData = web3.eth.abi.decodeLog(
          PROXY_AUCTION_ABI[4]['inputs'],
          result.data,
          result.topics.slice(1),
        );

        const basketId = decodedData.basketId;
        const subBaskets = decodedData.subBaskets;
        const basketOwner = decodedData.basketOwner;
        console.log(
          '\nbasketId: ',
          basketId,
          '\nbasketOwner',
          basketOwner,
          '\nsubBaskets: ',
          subBaskets,
        );

        let NftAddresses = [];
        let tokenIds = [];
        let quantities = [];
        let tokenStandards = [];
        subBaskets.forEach((subBasket) => {
          for (let i = 0; i < subBasket.asset_token_ids.length; i++) {
            NftAddresses.push(subBasket.NFT_contract_address);
            tokenIds.push(subBasket.asset_token_ids[i]);
            quantities.push(subBasket.quantities[i]);
            tokenStandards.push(subBasket.tokenStandard);
          }
        });

        //save in DB
        await _createBasketHelper(
          result,
          basketId,
          NftAddresses,
          tokenIds,
          quantities,
          basketOwner,
          tokenStandards,
        );
      }
    },
  );
};

const BasketDestroyEventSubscription = async function () {
  await updateLastSyncedBlock();

  // Subscribing to BasketDestroy event
  await web3.eth.subscribe(
    'logs',
    {
      address: [config.NETWORK_CONFIG.PROXY_ADDRESS.toLowerCase()],
    },

    async function (err, result) {
      if (
        !err &&
        result.address.toLowerCase() ===
          config.NETWORK_CONFIG.PROXY_ADDRESS.toLowerCase() &&
        result.topics[0] === config.EVENT_TOPIC_SIGNATURES.BASKET_DESTROY
      ) {
        console.log('Result basket', result);
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
          `decoding ${PROXY_AUCTION_ABI[5]['name']} eventLogs in BasketEvents`,
        );
        const decodedData = web3.eth.abi.decodeLog(
          PROXY_AUCTION_ABI[5]['inputs'],
          result.data,
          result.topics.slice(1),
        );

        const basketId = decodedData.basketId;

        await _destoryBasketHelper(result, basketId);
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

const scrapeCreateBasketEventLogs = async function () {
  try {
    if (processing || !initialised) {
      return;
    }
    processing = true;
    console.log('Scraping Create Basket event logs...');
    let promises = [];

    const lastSeenBlockRes = await lastSeenBlocksModel.findOne();

    const lastSeenBlock = lastSeenBlockRes.blockNumberProxy;

    let fromBlock = parseInt(lastSeenBlock) + 1 + '';
    let toBlock;
    const latestBlockNumber = await web3.eth.getBlockNumber();
    if (latestBlockNumber > config.CONFIRMATION_COUNT) {
      toBlock = latestBlockNumber - config.CONFIRMATION_COUNT + '';
    } else {
      toBlock = fromBlock;
    }
    if (fromBlock <= toBlock) {
      const allEventLogs = await ProxyContract.getPastEvents('allEvents', {
        fromBlock: fromBlock,
        toBlock: toBlock,
      });
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
          case 'BasketCreate': {
            const basketId = element.returnValues.basketId;
            const basketOwner = element.returnValues.basketOwner;
            const subBaskets = element.returnValues.subBaskets;
            let NftAddresses = [];
            let tokenIds = [];
            let quantities = [];
            let tokenStandards = [];
            subBaskets.forEach((subBasket) => {
              for (let i = 0; i < subBasket.asset_token_ids.length; i++) {
                NftAddresses.push(subBasket.NFT_contract_address);
                tokenIds.push(subBasket.asset_token_ids[i]);
                quantities.push(subBasket.quantities[i]);
                tokenStandards.push(subBasket.tokenStandard);
              }
            });

            promises.push(
              _createBasketHelper(
                element,
                basketId,
                NftAddresses,
                tokenIds,
                quantities,
                basketOwner,
                tokenStandards,
              ),
            );

            break;
          }

          case 'BasketDestroy': {
            const basketId = element.returnValues.basketId;

            promises.push(_destoryBasketHelper(element, basketId));
            break;
          }
          default:
            break;
        }
      }
      const resp = await lastSeenBlocksModel.findOneAndUpdate(
        {},
        { blockNumberProxy: toBlock },
        { new: true },
      );
      await resp.save();
    }

    await Promise.all(promises);
  } catch (error) {
    console.log(error);
  } finally {
    processing = false;
  }
};

// Initialize scraping create basket event logs

const initScrapeCreateBasketEventLogs = async function (lastSeenBlockRes) {
  try {
    console.log('Initializing create basket event logs...');
    // Start from block next to the last seen block till the (latestBlock - CONFIRMATION_COUNT)

    const lastSeenBlock = lastSeenBlockRes.blockNumberProxy;

    let fromBlock = parseInt(lastSeenBlock) + 1 + '';
    let toBlock;
    const latestBlockNumber = await web3.eth.getBlockNumber();
    if (latestBlockNumber > config.CONFIRMATION_COUNT) {
      toBlock = latestBlockNumber - config.CONFIRMATION_COUNT + '';
    } else {
      toBlock = fromBlock;
    }

    if (fromBlock <= toBlock) {
      const allEventLogs = await ProxyContract.getPastEvents('allEvents', {
        fromBlock: fromBlock,
        toBlock: toBlock,
      });
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
          case 'BasketCreate': {
            const basketId = element.returnValues.basketId;
            const subBaskets = element.returnValues.subBaskets;
            const basketOwner = element.returnValues.basketOwner;
            let NftAddresses = [];
            let tokenIds = [];
            let quantities = [];
            let tokenStandards = [];
            subBaskets.forEach((subBasket) => {
              for (let i = 0; i < subBasket.asset_token_ids.length; i++) {
                NftAddresses.push(subBasket.NFT_contract_address);
                tokenIds.push(subBasket.asset_token_ids[i]);
                quantities.push(subBasket.quantities[i]);
                tokenStandards.push(subBasket.tokenStandard);
              }
            });

            await _createBasketHelper(
              element,
              basketId,
              NftAddresses,
              tokenIds,
              quantities,
              basketOwner,
              tokenStandards,
            );

            break;
          }

          case 'BasketDestroy': {
            const basketId = element.returnValues.basketId;

            await _destoryBasketHelper(element, basketId);
            break;
          }
          default:
            break;
        }
      }
      const resp = await lastSeenBlocksModel.findOneAndUpdate(
        {},
        { blockNumberProxy: toBlock },
        { new: true },
      );
      await resp.save();
    }

    initialised = true;
  } catch (error) {
    console.log(error);
  }
};

async function _createBasketHelper(
  eventLog,
  basketId,
  nftContracts,
  tokenIds,
  quantities,
  basketOwner,
  tokenStandards,
) {
  const dbBasket = await createBasketHelper(
    basketId,
    nftContracts,
    tokenIds,
    quantities,
    basketOwner,
    tokenStandards,
  );

  await basketCreateAssetHistoryHelper(eventLog, dbBasket);

  const seentx = new seenTransactionModel({
    transactionHash: eventLog.transactionHash,
    blockNumber: eventLog.blockNumber,
    eventLog: eventLog,
    state: 'APPLIED',
  });
  await seentx.save();
}

async function _destoryBasketHelper(eventLog, basketId) {
  await destoryBasketHelper(basketId);

  await basketDestroyAssetHistoryHelper(eventLog, basketId);

  const seentx = new seenTransactionModel({
    transactionHash: eventLog.transactionHash,
    blockNumber: eventLog.blockNumber,
    eventLog: eventLog,
    state: 'APPLIED',
  });
  await seentx.save();
}

module.exports = {
  BasketCreateEventSubscription,
  BasketDestroyEventSubscription,
  scrapeCreateBasketEventLogs,
  initScrapeCreateBasketEventLogs,
};
