const {
  DECENTRALAND_NFT_CONTRACT_ABI,
  ENS_NFT_CONTRACT_ABI,
} = require('./abi');
const { NETWORK_CONFIG } = require('./config');

const lastSeenBlock = require('./models/last_seen_blocks');
const nftContractModel = require('./models/NFT_contracts');

async function seedDbEntriesNFT() {
  const nftContractInstance = await nftContractModel.findOne();
  if (!nftContractInstance) {
    const nftContract = new nftContractModel({
      tokenContract: '0x3bac337C50091d609eC60bb9d1025908f8019a92',
      name: 'Decentraland',
      template: {
        assetTokenId: '',
        collection_id: '',
        mintedAt: null,
        mintedBy: null,
        name: 'name',
        description: 'description',
        image: 'image',
        attributes: 'attributes',
        external_url: 'external_url',
        metadataURL: null,
        metadataJSON: null,
        owner: null,
        background_image: null,
        background_color: 'background_color',
        NFTCollection: 'Decentraland',
      },
      lastSeenBlock: 0,
      abi: JSON.stringify(DECENTRALAND_NFT_CONTRACT_ABI),
    });
    await nftContract.save();
  }
}

async function seedDbEntriesLastSeenBlock() {
  const lastSeenBlockInstance = await lastSeenBlock.findOne();
  if (!lastSeenBlockInstance) {
    const lastSeenBlock = new last_seen_blocks({
      blockNumberEnglish: NETWORK_CONFIG.START_BLOCK_ENGLISH,
      blockNumberDutch: NETWORK_CONFIG.START_BLOCK_DUTCH,
    });
    await lastSeenBlock.save();
  }
}
module.exports = {
  seedDbEntriesNFT,
  seedDbEntriesLastSeenBlock,
};
