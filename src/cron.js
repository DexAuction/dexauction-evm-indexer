const { scrapeEnglishAuctionEventLogs } = require("./services/EnglishAuctionEvents");
const { scrapeDutchAuctionEventLogs } = require("./services/DutchAuctionEvents");

const CronJob = require('cron').CronJob;

const scrapingJob = new CronJob(
  '1 * * * * *',
  async () => {
    console.log("\nStarting event scraping ...");
    await scrapeEnglishAuctionEventLogs();
    await scrapeDutchAuctionEventLogs();
  }
);

module.exports = {
  scrapingJob
};
  