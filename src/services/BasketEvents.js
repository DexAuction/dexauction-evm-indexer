const res = require("express/lib/response");
const Web3 = require("web3");
const config = require("../config");
const web3 = new Web3(config.NETWORK_CONFIG.WS_NETWORK_URL);
const seenTransactionModel = require("../models/seenTransaction");
const lastSeenBlocksModel = require('../models/last_seen_blocks');
const req = require("express/lib/request");
const {createBasketHelper} = require("../helper/utils");
const { PROXY_AUCTION_ABI } = require('../abi');

let ProxyContract = new web3.eth.Contract(
  PROXY_AUCTION_ABI,
  config.NETWORK_CONFIG.PROXY_ADDRESS,
);

const BasketCreateEventSubscription = async function () {
  await updateLastSyncedBlock();

  let basketId;

  const subscribingCreateBasket = await web3.eth.subscribe(
    "logs",
    {
      address: [
        config.NETWORK_CONFIG.PROXY_ADDRESS.toLowerCase(),
      ],
    },

    async function (err, result) {
      if (
        !err &&
        result.address.toLowerCase() ===
        config.NETWORK_CONFIG.PROXY_ADDRESS.toLowerCase() &&
        result.topics[0] === config.EVENT_TOPIC_SIGNATURES.BASKET_CREATE
      ) {
        console.log("Result basket",result);
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

        const decodedData = web3.eth.abi.decodeLog(
          PROXY_AUCTION_ABI[4]["inputs"], 
          result.data, 
          result.topics.slice(1)
        );

        const basketId = decodedData.basketId;
        const subBaskets = decodedData.subBaskets;
        console.log("\nbasketId: ", basketId,"\nsubBaskets: ", subBaskets);

        let NftAddresses = [];
        let tokenIds = [];
        let quantities = [];
        subBaskets.forEach(subBasket => {
          for (let i = 0; i < subBasket.asset_token_ids.length; i++) {
            NftAddresses.push(subBasket.NFT_contract_address);
            tokenIds.push(subBasket.asset_token_ids[i]);
            quantities.push(subBasket.quantities[i]);
          }
        });

        //save in DB
        _createBasketHelper(result,
          basketId,
          NftAddresses,
          tokenIds,
          quantities)
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

const scrapeCreateBasketEventLogs = async function () {
  try {
    if (processing || !initialised) {
      return;
    }
    processing = true;
    console.log("Scraping Create Basket event logs...");
    let promises = [];

      
    const lastSeenBlockRes = await lastSeenBlocksModel.findOne();

    const lastSeenBlock = lastSeenBlockRes.blockNumberProxy;

      let from_Block = parseInt(lastSeenBlock) + 1 + "";
      let to_Block;
      const latestBlockNumber = await web3.eth.getBlockNumber();
      if (latestBlockNumber > config.CONFIRMATION_COUNT) {
        to_Block = latestBlockNumber - config.CONFIRMATION_COUNT + "";
      } else {
        to_Block = from_Block;
      }
      if (from_Block <= to_Block) {
        const allEventLogs = await ProxyContract.getPastEvents(
          "allEvents",
          {
            fromBlock: from_Block,
            toBlock: to_Block,
          }
        );
        console.log("allEventLogs ", allEventLogs);
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
              case "BasketCreate":
                let basketId = element.returnValues.basketId;
                let subBaskets = element.returnValues.subBaskets;
                let NftAddresses = [];
                let tokenIds = [];
                let quantities = [];
                subBaskets.forEach(subBasket => {
                  for (let i = 0; i < subBasket.asset_token_ids.length; i++) {
                    NftAddresses.push(subBasket.NFT_contract_address);
                    tokenIds.push(subBasket.asset_token_ids[i]);
                    quantities.push(subBasket.quantities[i]);
                  }
                });

                _createBasketHelper(element,
                  basketId,
                  NftAddresses,
                  tokenIds,
                  quantities)

                break;
              default:
                break;
            }
          
        }
          const resp = await lastSeenBlocksModel.findOneAndUpdate(
      {},
      { blockNumberProxy: to_Block },
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
    console.log("Initializing create basket event logs...");
    // Start from block next to the last seen block till the (latestBlock - CONFIRMATION_COUNT)

    const lastSeenBlock = lastSeenBlockRes.blockNumberProxy;

      let from_Block = parseInt(lastSeenBlock) + 1 + "";
      let to_Block;
      const latestBlockNumber = await web3.eth.getBlockNumber();
      if (latestBlockNumber > config.CONFIRMATION_COUNT) {
        to_Block = latestBlockNumber - config.CONFIRMATION_COUNT + "";
      } else {
        to_Block = from_Block;
      }

      if (from_Block <= to_Block) {
        const allEventLogs = await ProxyContract.getPastEvents(
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
            case "BasketCreate":
              let basketId = element.returnValues.basketId;
              let subBaskets = element.returnValues.subBaskets;
              let NftAddresses = [];
              let tokenIds = [];
              let quantities = [];
              subBaskets.forEach(subBasket => {
                for (let i = 0; i < subBasket.asset_token_ids.length; i++) {
                  NftAddresses.push(subBasket.NFT_contract_address);
                  tokenIds.push(subBasket.asset_token_ids[i]);
                  quantities.push(subBasket.quantities[i]);
                }
              });

              _createBasketHelper(element,
                basketId,
                NftAddresses,
                tokenIds,
                quantities);

                break;
            default:
              break;
          }
        }
        const resp = await lastSeenBlocksModel.findOneAndUpdate(
          {},
          { blockNumberProxy: to_Block },
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
  EventLog,
  basketId,
  nftContracts,
  tokenIds,
  quantities
) {
  const seentx = new seenTransactionModel({
    transactionHash: EventLog.transactionHash,
    blockNumber: EventLog.blockNumber,
    eventLog: EventLog,
    state: "APPLIED",
  });
  await seentx.save();
  createBasketHelper(
    EventLog,
    basketId,
    nftContracts,
    tokenIds,
    quantities
  );
}

module.exports = {
    BasketCreateEventSubscription,
    scrapeCreateBasketEventLogs,
    initScrapeCreateBasketEventLogs
};
