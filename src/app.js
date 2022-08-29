const express = require("express");
const bodyParser = require("body-parser");
const mongo = require("./db");
const app = express();
const { NETWORK_CONFIG, CONFIRMATION_COUNT } = require("./config");
const {
  DECENTRALAND_NFT_CONTRACT_ABI,
  ENS_NFT_CONTRACT_ABI,
} = require("./abi");
const last_seen_blocks = require("./models/last_seen_blocks");
const nftContractModel = require("./models/NFT_contracts");

// parse requests of content-type - application/json
app.use(bodyParser.json());
// parse requests of content-type - application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));

async function seedDbEntriesNFT() {
  const lastSeenBlockInstance = await nftContractModel.findOne();
  if (!lastSeenBlockInstance) {
    const nftContract = new nftContractModel({
      tokenContract: "0x3bac337C50091d609eC60bb9d1025908f8019a92",
      name: "Decentraland",
      template: {
        assetTokenId: "",
        collection_id: "",
        mintedAt: null,
        mintedBy: null,
        name: "name",
        description: "description",
        image: "image",
        attributes: "attributes",
        external_url: "external_url",
        metadataURL: null,
        metadataJSON: null,
        owner: null,
        background_image: null,
        background_color: "background_color",
        NFTCollection: "Decentraland",
      },
      lastSeenBlock: 0,
      abi: JSON.stringify(DECENTRALAND_NFT_CONTRACT_ABI),
    });
    await nftContract.save();
  }
}
async function seedDbEntries() {
  const lastSeenBlockInstance = await last_seen_blocks.findOne();
  if (!lastSeenBlockInstance) {
    const lastSeenBlock = new last_seen_blocks({
      blockNumberEnglish: NETWORK_CONFIG.START_BLOCK_ENGLISH,
      blockNumberDutch: NETWORK_CONFIG.START_BLOCK_DUTCH,
    });
    await lastSeenBlock.save();
  }
}
// set port, listen for requests, start cron
const PORT = process.env.PORT || 3000;
const { getHealth } = require("./health");
const { scrapingJob } = require("./cron");
const {
  EnglishCreateAuctionEventSubscription,
  EnglishConfigureAuctionEventSubscription,
  EnglishPlaceBidEventSubscription,
  EnglishAuctionCancelEventSubscription,
  EnglishAuctionEndEventSubscription,
  EnglishAuctionCompleteEventSubscription,
  initScrapeEnglishAuctionEventLogs,
} = require("./services/EnglishAuctionEvents");

const {
  DutchCreateAuctionEventSubscription,
  DutchConfigureAuctionEventSubscription,
  DutchAcceptPriceEventSubscription,
  DutchAuctionCancelEventSubscription,
  initScrapeDutchAuctionEventLogs,
} = require("./services/DutchAuctionEvents");

const {
  NftTransferEventSubscription,
  initScrapeNftContractEventLogs,
} = require("./services/NFTContractEvents");

// initialize function to initialize the block indexer
async function initialize() {
  const lastSeenBlockInstance = await last_seen_blocks.findOne();
  const NFTcontracts = await nftContractModel.find();
  if (!lastSeenBlockInstance) {
    lastSeenBlockInstance = new last_seen_blocks({
      blockNumberEnglish: NETWORK_CONFIG.START_BLOCK_ENGLISH,
      blockNumberDutch: NETWORK_CONFIG.START_BLOCK_DUTCH,
    });
    await lastSeenBlockInstance.save();
  }
  if (!NFTcontracts) {
    NFTcontracts = new nftContractModel({
      tokenContract: "0x3bac337C50091d609eC60bb9d1025908f8019a92",
      name: "Decentraland",
      template: {
        assetTokenId: "",
        collection_id: "",
        mintedAt: null,
        mintedBy: null,
        name: "name",
        description: "description",
        image: "image",
        attributes: "attributes",
        external_url: "external_url",
        metadataURL: null,
        metadataJSON: null,
        owner: null,
        background_image: null,
        background_color: "background_color",
        NFTCollection: "Decentraland",
      },
      lastSeenBlock: 0,
      abi: JSON.stringify(DECENTRALAND_NFT_CONTRACT_ABI),
    });
    await NFTcontracts.save();
  }

  await initScrapeNftContractEventLogs(NFTcontracts);
  await initScrapeEnglishAuctionEventLogs(lastSeenBlockInstance);
  await initScrapeDutchAuctionEventLogs(lastSeenBlockInstance);
}

async function eventSubscriptions() {
  await EnglishCreateAuctionEventSubscription();
  await EnglishConfigureAuctionEventSubscription();
  await EnglishPlaceBidEventSubscription();
  await EnglishAuctionCancelEventSubscription();
  await EnglishAuctionEndEventSubscription();
  await EnglishAuctionCompleteEventSubscription();
  await DutchCreateAuctionEventSubscription();
  await DutchConfigureAuctionEventSubscription();
  await DutchAcceptPriceEventSubscription();
  await DutchAuctionCancelEventSubscription();
  await NftTransferEventSubscription();
}

app.listen(PORT, async () => {
  try {
    await mongo.connect();
    await seedDbEntries();
    await seedDbEntriesNFT();
    await initialize();
    console.log(
      "\n\n\n\n******************************************************************************  " +
        "Server is running on port " +
        PORT +
        "  ******************************************************************************\n\n"
    );
    const healthData = await getHealth();
    console.log("healthData", healthData);

    if (CONFIRMATION_COUNT == 0) {
      await eventSubscriptions();
    }

    scrapingJob.start();
  } catch (error) {
    console.log("An error occurred during startup: ", error);
    await mongo.close();
    process.exit(1);
  }
});
