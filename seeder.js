const {
  DECENTRALAND_NFT_CONTRACT_ABI,
  ENS_NFT_CONTRACT_ABI,
  ERC1155_NFT_CONTRACT_ABI,
} = require('./src/abi');
const { NETWORK_CONFIG } = require('./src/config');
const lastSeenBlocks = require('./src/models/last_seen_blocks');
const nftContractModel = require('./src/models/nft_contracts');

async function seedDbEntriesNFT() {
  const decentralandContractInstance = await nftContractModel.findOne({
    contractAddress: NETWORK_CONFIG.DECENTRALAND_NFT_CONTRACT_ADDRESS,
  });
  if (!decentralandContractInstance) {
    const decentralandContract = new nftContractModel({
      contractAddress: NETWORK_CONFIG.DECENTRALAND_NFT_CONTRACT_ADDRESS,
      name: 'Decentraland',
      template: {
        name: 'name',
        description: 'description',
        image: 'image',
        attributes: 'attributes',
        externalUrl: 'external_url',
        backgroundImage: null,
        backgroundColor: 'background_color',
      },
      lastSeenBlock: 0,
      abi: JSON.stringify(DECENTRALAND_NFT_CONTRACT_ABI),
    });
    await decentralandContract.save();
  }

  const ensContractInstance = await nftContractModel.findOne({
    contractAddress: NETWORK_CONFIG.ENS_NFT_CONTRACT_ADDRESS,
  });
  if (!ensContractInstance) {
    const ensContract = new nftContractModel({
      contractAddress: NETWORK_CONFIG.ENS_NFT_CONTRACT_ADDRESS,
      name: 'ENS',
      template: {
        name: 'name',
        description: 'description',
        image: 'image',
        attributes: 'attributes',
        externalUrl: 'url',
        backgroundImage: null,
        backgroundColor: 'background_color',
      },
      lastSeenBlock: 0,
      abi: JSON.stringify(ENS_NFT_CONTRACT_ABI),
    });
    await ensContract.save();
  }

  const erc1155ContractInstance = await nftContractModel.findOne({
    contractAddress: NETWORK_CONFIG.ERC1155_NFT_CONTRACT_ADDRESS,
  });
  if (!erc1155ContractInstance) {
    const erc1155Contract = new nftContractModel({
      contractAddress: NETWORK_CONFIG.ERC1155_NFT_CONTRACT_ADDRESS,
      name: 'ERC1155',
      template: {
        name: 'name',
        description: 'description',
        image: 'image',
        attributes: 'properties',
        externalUrl: 'external_url',
        backgroundImage: null,
        backgroundColor: 'background_color',
      },
      lastSeenBlock: 0,
      abi: JSON.stringify(ERC1155_NFT_CONTRACT_ABI),
    });
    await erc1155Contract.save();
  }
}

async function seedDbEntriesLastSeenBlock() {
  const lastSeenBlockInstance = await lastSeenBlocks.findOne();
  if (!lastSeenBlockInstance) {
    const lastSeenBlock = new lastSeenBlocks({
      blockNumberEnglish: NETWORK_CONFIG.START_BLOCK_ENGLISH,
      blockNumberDutch: NETWORK_CONFIG.START_BLOCK_DUTCH,
      blockNumberProxy: NETWORK_CONFIG.START_BLOCK_PROXY,
    });
    await lastSeenBlock.save();
  }
}
module.exports = {
  seedDbEntriesNFT,
  seedDbEntriesLastSeenBlock,
};
