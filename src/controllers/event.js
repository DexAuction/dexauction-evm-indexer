const Web3 = require('web3');
const config = require('../config');
const web3 = new Web3(config.NETWORK_CONFIG.ALCHEMY_ENDPOINT_POLY);
const axios = require('axios');
const { ZERO_ADDRESS } = require('../constants');
const { getApiKey } = require('../helper/utils');
class EventController {
  async eventExtract(req, res) {
    //request: Contract address, network, start block, to block, event name
    const apiKey = await getApiKey(req.query.network);
    const URL = `${config.NETWORK_CONFIG.BASE_EXPLORER_API_URL}?module=contract&action=getabi&address=${req.query.contractAddress}&apikey=${apiKey}`;
    let response = await axios.get(URL);
    const abi = JSON.parse(response.data.result);
    const contractInstance = new web3.eth.Contract(
      abi,
      req.query.contractAddress,
    );

    //get all past events from fromBlock to toblock
    const allEventLogs = await contractInstance.getPastEvents(
      req.query.eventName,
      {
        fromBlock: req.query.startBlock,
        toBlock: req.query.endBlock,
      },
    );
    let allEventLogsFilter = [];

    //get all mint events
    for (let element of allEventLogs) {
      if (element.returnValues.from === ZERO_ADDRESS) {
        allEventLogsFilter.push(element);
      }
    }
    res.send(allEventLogsFilter);
  }
}

module.exports = new EventController();
