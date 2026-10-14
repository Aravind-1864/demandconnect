const dns = require("dns");
const mongoose = require("mongoose");
const env = require("./env");

mongoose.set("strictQuery", true);

async function connectDB(uri = env.MONGODB_URI) {
  // Some Windows/ISP resolvers refuse SRV lookups that Atlas (mongodb+srv) needs
  if (uri.startsWith("mongodb+srv://")) dns.setServers(["8.8.8.8", "1.1.1.1", ...dns.getServers()]);
  const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  if (env.NODE_ENV !== "test") {
    console.log(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  }
  return conn;
}

module.exports = connectDB;
