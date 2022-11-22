const config = require('./config');

const getHealth = async function () {
  const Web3 = require('web3');
  const web3 = new Web3(config.NETWORK_CONFIG.HTTP_NETWORK_URL);
  const lastestBlock = await web3.eth.getBlock('latest');
  console.log('lastestblock ', lastestBlock);

  const health =
    lastestBlock.number - config.LAST_SYNCED_BLOCK > 5 ? 'NOT OK' : 'OK';
  return {
    lastSyncedBlock: config.LAST_SYNCED_BLOCK,
    // lastScrapedBlock,
    lastMinedBlock: lastestBlock.number,
    health,
  };
};

module.exports = {
  getHealth,
};
