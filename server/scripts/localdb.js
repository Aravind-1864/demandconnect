// Local dev MongoDB on 27017 (data kept in server/.localdb). Run: node scripts/localdb.js
const path = require("path");
const { MongoMemoryServer } = require("mongodb-memory-server");
MongoMemoryServer.create({
  instance: { port: 27017, dbPath: path.join(__dirname, "..", ".localdb"), storageEngine: "wiredTiger" },
}).then((m) => console.log("Local MongoDB ready at " + m.getUri()));
