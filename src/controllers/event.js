const Web3 = require('web3');
const config = require('../config');
const web3 = new Web3(config.NETWORK_CONFIG.ALCHEMY_ENDPOINT_POLY);
const axios = require('axios');
const { ZERO_ADDRESS } = require('../constants') ;
class EventController {
  async eventExtract(req, res) {
    console.log("web3",web3);
    //request: Contract address, network, start block, to block, mint event
    const URL = `https://api.polygonscan.com/api?module=contract&action=getabi&address=${req.query.contractAddress}&apikey=${config.NETWORK_CONFIG.POLYSCAN_API_KEY}`;
    let response = await axios.get(URL);
    const abi = JSON.parse(response.data.result);
    const contractInstance = new web3.eth.Contract(
      abi,
      req.query.contractAddress
    );
    const allEventLogs = await contractInstance.getPastEvents(req.query.eventName, {
      fromBlock: req.query.startBlock,
      toBlock: req.query.endBlock,
    });
    let allEventLogsFilter=[];
    for (let element of allEventLogs) {
      if (element.returnValues.from == ZERO_ADDRESS) {
        allEventLogsFilter.push(element);
      }
    }
    res.send(allEventLogsFilter);
  }
}

module.exports = new EventController();
