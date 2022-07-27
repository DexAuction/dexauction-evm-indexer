const express = require("express");
const bodyParser = require("body-parser");
const mongo = require("./db");
const app = express();
const { NETWORK_CONFIG, CONFIRMATION_COUNT } = require("./config");

const last_seen_blocks = require("./models/last_seen_blocks");

// parse requests of content-type - application/json
app.use(bodyParser.json());
// parse requests of content-type - application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));

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
const {
  EnglishCreateAuctionEventSubscription,
  EnglishConfigureAuctionEventSubscription,
  EnglishPlaceBidEventSubscription,
  EnglishAuctionCancelEventSubscription,
  EnglishAuctionEndEventSubscription,
  EnglishAuctionCompleteEventSubscription,
  scrapeEnglishAuctionEventLogs,
} = require("./services/EnglishAuctionEvents");

const {
  DutchCreateAuctionEventSubscription,
  DutchConfigureAuctionEventSubscription,
  DutchAcceptPriceEventSubscription,
  DutchAuctionCancelEventSubscription,
  scrapeDutchAuctionEventLogs,
} = require("./services/DutchAuctionEvents");

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
}

async function eventScraping() {
  await scrapeEnglishAuctionEventLogs();
  await scrapeDutchAuctionEventLogs();
}

const CronJob = require('cron').CronJob;
const scrapingJob = new CronJob(
  '1 * * * * *',
  async () => {
    console.log("\nStarting event scraping ...");
    await eventScraping();
  }
);

app.listen(PORT, async () => {
  try {
    await mongo.connect();
    await seedDbEntries();
    console.log(
      "\n\n\n\n******************************************************************************  " +
        "Server is running on port " +
        PORT +
        "  ******************************************************************************\n\n"
    );
    const healthData = await getHealth();
    console.log("healthData", healthData);

    if (CONFIRMATION_COUNT==0) {
      await eventSubscriptions();
    }
    await eventScraping();
  } catch (error) {
    console.log("An error occurred during startup: ", error);
    await mongo.close();
    process.exit(1);
  }
});

scrapingJob.start();
