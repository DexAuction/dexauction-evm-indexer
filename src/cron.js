const {
  scrapeEnglishAuctionEventLogs,
} = require('./services/EnglishAuctionEvents');
const {
  scrapeDutchAuctionEventLogs,
} = require('./services/DutchAuctionEvents');
const { scrapeNftContractEventLogs } = require('./services/NFTContractEvents');
const { scrapeCreateBasketEventLogs } = require('./services/BasketEvents');
const CronJob = require('cron').CronJob;

const scrapingJob = new CronJob('1 * * * * *', async () => {
  console.log('\nStarting event scraping ...');
  await scrapeNftContractEventLogs();
  await scrapeCreateBasketEventLogs();
  await scrapeEnglishAuctionEventLogs();
  await scrapeDutchAuctionEventLogs();
});

module.exports = {
  scrapingJob,
};
