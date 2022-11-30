const mongoose = require('mongoose');
const MONGO_URI = process.env.MONGO_URI;
async function connect() {
  await mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log('Mongo Connected!');
}

async function close() {
  return mongoose.disconnect();
}

module.exports = { connect, close };
