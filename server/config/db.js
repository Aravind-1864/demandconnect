const mongoose = require("mongoose");
const env = require("./env");

mongoose.set("strictQuery", true);

async function connectDB(uri = env.MONGODB_URI) {
  const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  if (env.NODE_ENV !== "test") {
    console.log(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  }
  return conn;
}

module.exports = connectDB;
