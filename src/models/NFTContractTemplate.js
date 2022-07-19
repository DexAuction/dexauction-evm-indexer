const mongoose = require("mongoose");

const masterTemplate = new mongoose.Schema({
  tokenContract: {
    type: String,
    unique: true,
  },
  // metadataMapping
  template: {
    type: Object,
  },
  name: {
    type: String,
  },
});

module.exports = mongoose.model("masterTemplate", masterTemplate);