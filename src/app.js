const express = require('express');
const bodyParser = require('body-parser');
const mongo = require('./db');
const app = express();
const { CONFIRMATION_COUNT } = require('./config');
const lastSeenBlocks = require('./models/last_seen_blocks');
const nftContractModel = require('./models/nft_contracts');
const { seedDbEntriesNFT, seedDbEntriesLastSeenBlock } = require('../seeder');
// parse requests of content-type - application/json
app.use(bodyParser.json());
// parse requests of content-type - application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/api/event', require('./api/event'));
// set port, listen for requests, start cron
const PORT = process.env.PORT || 3000;
const { getHealth } = require('./health');
const { scrapingJob } = require('./cron');
const {
  EnglishCreateAuctionEventSubscription,
  EnglishConfigureAuctionEventSubscription,
  EnglishPlaceBidEventSubscription,
  EnglishAuctionCancelEventSubscription,
  // EnglishAuctionEndEventSubscription,
  EnglishAuctionCompleteEventSubscription,
  initScrapeEnglishAuctionEventLogs,
} = require('./services/EnglishAuctionEvents');

const {
  DutchCreateAuctionEventSubscription,
  DutchConfigureAuctionEventSubscription,
  DutchAcceptPriceEventSubscription,
  DutchAuctionCancelEventSubscription,
  initScrapeDutchAuctionEventLogs,
} = require('./services/DutchAuctionEvents');

const {
  NftTransferEventSubscription,
  ERC1155NftTransferEventSubscription,
  initScrapeNftContractEventLogs,
} = require('./services/NFTContractEvents');

const {
  BasketCreateEventSubscription,
  BasketDestroyEventSubscription,
  initScrapeCreateBasketEventLogs,
} = require('./services/BasketEvents');
// initialize function to initialize the block indexer
async function initialize() {
  await seedDbEntriesLastSeenBlock();
  await seedDbEntriesNFT();
  const NFTcontracts = await nftContractModel.find();
  const lastSeenBlockInstance = await lastSeenBlocks.findOne();

  await initScrapeNftContractEventLogs(NFTcontracts);
  await initScrapeCreateBasketEventLogs(lastSeenBlockInstance);
  await initScrapeEnglishAuctionEventLogs(lastSeenBlockInstance);
  await initScrapeDutchAuctionEventLogs(lastSeenBlockInstance);
}

async function eventSubscriptions() {
  await EnglishCreateAuctionEventSubscription();
  await EnglishConfigureAuctionEventSubscription();
  await EnglishPlaceBidEventSubscription();
  await EnglishAuctionCancelEventSubscription();
  // await EnglishAuctionEndEventSubscription();
  await EnglishAuctionCompleteEventSubscription();
  await DutchCreateAuctionEventSubscription();
  await DutchConfigureAuctionEventSubscription();
  await DutchAcceptPriceEventSubscription();
  await DutchAuctionCancelEventSubscription();
  await NftTransferEventSubscription();
  await ERC1155NftTransferEventSubscription();
  await BasketCreateEventSubscription();
  await BasketDestroyEventSubscription();
}

app.listen(PORT, async () => {
  try {
    await mongo.connect();
    await seedDbEntriesLastSeenBlock();
    await seedDbEntriesNFT();
    await initialize();
    console.log(
      '\n\n\n\n******************************************************************************  ' +
        'Server is running on port ' +
        PORT +
        '  ******************************************************************************\n\n',
    );
    const healthData = await getHealth();
    console.log('healthData', healthData);
    if (CONFIRMATION_COUNT == 0) {
      await eventSubscriptions();
    }

    scrapingJob.start();
  } catch (error) {
    console.log('An error occurred during startup: ', error);
    await mongo.close();
    throw error;
  }
});
