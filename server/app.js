const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const env = require("./config/env");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const { favoriteRouter, notificationRouter, messageRouter, uploadRouter, UPLOAD_DIR } = require("./routes/socialRoutes");

const app = express();

app.disable("x-powered-by");
// CSP off: the built web app loads Google Fonts, remote photos and map tiles
app.use(helmet({ contentSecurityPolicy: false, referrerPolicy: { policy: "strict-origin-when-cross-origin" }, crossOriginResourcePolicy: { policy: "cross-origin" } })); // uploads are shown on the web app origin
app.use(cors({ origin: env.CLIENT_URL.split(",").map((s) => s.trim()) }));
app.use(express.json({ limit: "100kb" }));
if (env.NODE_ENV === "development") app.use(morgan("dev"));

app.get("/api/health", (_req, res) => {
  res.json({ success: true, message: "DemandConnect API is running" });
});

// Brute-force protection on credential endpoints.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.NODE_ENV === "test" ? 10000 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts. Please try again later." },
});

app.use("/api/auth", authLimiter, require("./routes/authRoutes"));
app.use("/api/categories", require("./routes/categoryRoutes"));
app.use("/api/providers", require("./routes/providerRoutes"));
app.use("/api/requests", require("./routes/requestRoutes"));
app.use("/api/proposals", require("./routes/proposalRoutes"));
app.use("/api/bookings", require("./routes/bookingRoutes"));
app.use("/api/reviews", require("./routes/reviewRoutes"));
app.use("/api/ai", require("./routes/aiRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/favorites", favoriteRouter);
app.use("/api/notifications", notificationRouter);
app.use("/api/messages", messageRouter);
app.use("/api/uploads", uploadRouter);
app.use("/uploads", express.static(UPLOAD_DIR, { maxAge: "7d", immutable: true }));

// Single-service deploy: serve the built web app (client/dist) when it exists
const CLIENT_DIST = path.join(__dirname, "..", "client", "dist");
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST, { index: false }));
  app.get(/^\/(?!api\/|uploads\/|socket\.io\/).*/, (req, res) => res.sendFile(path.join(CLIENT_DIST, "index.html")));
}

app.use(notFound);
app.use(errorHandler);

module.exports = app;
