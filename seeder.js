const {
  ERC721_NFT_CONTRACT_ABI,
  ERC1155_NFT_CONTRACT_ABI,
} = require('./src/abi');
const { NETWORK_CONFIG } = require('./src/config');
const lastSeenBlocks = require('./src/models/last_seen_blocks');
const nftContractModel = require('./src/models/nft_contracts');

async function seedDbEntriesNFT() {
  const erc721ContractInstance = await nftContractModel.findOne({
    contractAddress: NETWORK_CONFIG.MYNEERC721_NFT_CONTRACT_ADDRESS,
  });
  if (!erc721ContractInstance) {
    const erc721Contract = new nftContractModel({
      contractAddress: NETWORK_CONFIG.MYNEERC721_NFT_CONTRACT_ADDRESS,
      name: 'MYNE ERC721',
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
      abi: JSON.stringify(ERC721_NFT_CONTRACT_ABI),
    });
    await erc721Contract.save();
  }

  const erc1155ContractInstance = await nftContractModel.findOne({
    contractAddress: NETWORK_CONFIG.MYNEERC1155_NFT_CONTRACT_ADDRESS,
  });
  if (!erc1155ContractInstance) {
    const erc1155Contract = new nftContractModel({
      contractAddress: NETWORK_CONFIG.MYNEERC1155_NFT_CONTRACT_ADDRESS,
      name: 'MYNE ERC1155',
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
