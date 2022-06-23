const mongoose = require("mongoose");
const MONGO_URI = `mongodb+srv://admin:admin@testcluster.f41zx.mongodb.net/DEXA?authSource=admin&replicaSet=atlas-3mrvyl-shard-0&readPreference=primary&appname=MongoDB%20Compass&ssl=true`;
// const MONGO_URI = `mongodb+srv://admin:admin@testcluster.f41zx.mongodb.net/Dexa-Rinkeby?authSource=admin&replicaSet=atlas-3mrvyl-shard-0&readPreference=primary&appname=MongoDB%20Compass&ssl=true`;
console.log(`Connecting MongoDB at ${MONGO_URI}`);
async function connect() {
  await mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log("Mongo Connected!");
}

async function close() {
  return mongoose.disconnect();
}

module.exports = { connect, close };
