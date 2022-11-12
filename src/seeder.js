const {
  DECENTRALAND_NFT_CONTRACT_ABI,
  ENS_NFT_CONTRACT_ABI,
} = require('./abi');
const { NETWORK_CONFIG } = require('./config');
const last_seen_blocks = require('./models/last_seen_blocks');
const nftContractModel = require('./models/NFT_contracts');

async function seedDbEntriesNFT() {
  const nft_contracts_Instance = await nftContractModel.findOne();
  if (!nft_contracts_Instance) {
    const nftContract = new nftContractModel({
      tokenContract: NETWORK_CONFIG.DECENTRALAND_NFT_CONTRACT_ADDRESS,
      name: 'Decentraland',
      template: {
        assetTokenId: '',
        collectionId: 0,
        fk_collectionId: '',
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
