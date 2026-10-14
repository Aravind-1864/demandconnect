const http = require("http");
const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");
const env = require("./config/env");
const connectDB = require("./config/db");
const app = require("./app");
const User = require("./models/User");
const realtime = require("./services/realtime");

function attachSockets(server) {
  const io = new Server(server, {
    cors: { origin: env.CLIENT_URL.split(",").map((s) => s.trim()) },
  });

  // Same JWT as the REST API.
  io.use(async (socket, next) => {
    try {
      const payload = jwt.verify(socket.handshake.auth?.token || "", env.JWT_SECRET);
      const user = await User.findById(payload.sub).select("_id isActive");
      if (!user?.isActive) return next(new Error("unauthorized"));
      socket.userId = String(user._id);
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    socket.join("user:" + socket.userId);
    // Typing indicator is relayed only; nothing is stored.
    socket.on("typing", ({ to }) => {
      if (typeof to === "string") io.to("user:" + to).emit("typing", { from: socket.userId });
    });
  });

  realtime.setIO(io);
}

async function start() {
  await connectDB();
  const server = http.createServer(app);
  attachSockets(server);
  server.listen(env.PORT, () => {
    console.log("DemandConnect API listening on port " + env.PORT + " (" + env.NODE_ENV + ")");
  });

  const shutdown = (signal) => {
    console.log(signal + " received, shutting down");
    server.close(() => process.exit(0));
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

start().catch((err) => {
  console.error("Failed to start server:", err.message);
  process.exit(1);
});
