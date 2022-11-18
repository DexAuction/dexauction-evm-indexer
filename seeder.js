const {
  DECENTRALAND_NFT_CONTRACT_ABI,
  ENS_NFT_CONTRACT_ABI,
  ERC1155_NFT_CONTRACT_ABI
} = require('./src/abi');
const { NETWORK_CONFIG } = require('./src/config');
const last_seen_blocks = require('./src/models/last_seen_blocks');
const nftContractModel = require('./src/models/NFT_contracts');

async function seedDbEntriesNFT() {
  const decentralandContractInstance = await nftContractModel.findOne({
    tokenContract : NETWORK_CONFIG.DECENTRALAND_NFT_CONTRACT_ADDRESS
  });
  if (!decentralandContractInstance) {
    const decentralandContract = new nftContractModel({
      tokenContract: NETWORK_CONFIG.DECENTRALAND_NFT_CONTRACT_ADDRESS,
      name: 'Decentraland',
      template: {
        name: 'name',
        description: 'description',
        image: 'image',
        attributes: 'attributes',
        external_url: 'external_url',
        background_image: null,
        background_color: 'background_color',
      },
      lastSeenBlock: 0,
      abi: JSON.stringify(DECENTRALAND_NFT_CONTRACT_ABI),
    });
    await decentralandContract.save();
  }

  const ensContractInstance = await nftContractModel.findOne({
    tokenContract : NETWORK_CONFIG.ENS_NFT_CONTRACT_ADDRESS
  });
  if (!ensContractInstance) {
    const ensContract = new nftContractModel({
      tokenContract: NETWORK_CONFIG.ENS_NFT_CONTRACT_ADDRESS,
      name: 'ENS',
      template: {
        name: 'name',
        description: 'description',
        image: 'image',
        attributes: 'attributes',
        external_url: 'url',
        background_image: null,
        background_color: 'background_color',
      },
      lastSeenBlock: 0,
      abi: JSON.stringify(ENS_NFT_CONTRACT_ABI),
    });
    await ensContract.save();
  }

  const erc1155ContractInstance = await nftContractModel.findOne({
    tokenContract : NETWORK_CONFIG.ERC1155_NFT_CONTRACT_ADDRESS
  });
  if (!erc1155ContractInstance) {
    const erc1155Contract = new nftContractModel({
      tokenContract: NETWORK_CONFIG.ERC1155_NFT_CONTRACT_ADDRESS,
      name: 'ERC1155',
      template: {
        name: 'name',
        description: 'description',
        image: 'image',
        attributes: 'properties',
        external_url: 'external_url',
        background_image: null,
        background_color: 'background_color',
      },
      lastSeenBlock: 0,
      abi: JSON.stringify(ERC1155_NFT_CONTRACT_ABI),
    });
    await erc1155Contract.save();
  }
}

async function seedDbEntriesLastSeenBlock() {
  const lastSeenBlockInstance = await last_seen_blocks.findOne();
  if (!lastSeenBlockInstance) {
    const lastSeenBlock = new last_seen_blocks({
      blockNumberEnglish: NETWORK_CONFIG.START_BLOCK_ENGLISH,
      blockNumberDutch: NETWORK_CONFIG.START_BLOCK_DUTCH,
      blockNumberProxy: NETWORK_CONFIG.START_BLOCK_PROXY
    });
    await lastSeenBlock.save();
  }
}
module.exports = {
  seedDbEntriesNFT,
  seedDbEntriesLastSeenBlock,
};
