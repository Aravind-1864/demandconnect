/** Favorites, notifications and messages share one file: small, closely related routers. */
const express = require("express");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const validate = require("../middleware/validate");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const ApiError = require("../utils/ApiError");
const v = require("../validators");
const favorites = require("../controllers/favoriteController");
const notifications = require("../controllers/notificationController");
const messages = require("../controllers/messageController");

const favoriteRouter = express.Router();
favoriteRouter.use(protect, authorize("CUSTOMER"));
favoriteRouter.get("/", favorites.list);
favoriteRouter.get("/ids", favorites.ids);
favoriteRouter.post("/:id", validate({ params: v.idParams }), favorites.add);
favoriteRouter.delete("/:id", validate({ params: v.idParams }), favorites.remove);

const notificationRouter = express.Router();
notificationRouter.use(protect);
notificationRouter.get("/", notifications.list);
notificationRouter.patch("/read-all", notifications.markAllRead);
notificationRouter.patch("/:id/read", validate({ params: v.idParams }), notifications.markRead);

const messageRouter = express.Router();
messageRouter.use(protect, authorize("CUSTOMER", "PROVIDER"));
messageRouter.get("/conversations", messages.conversations);
messageRouter.get("/unread-count", messages.unreadCount);
messageRouter.get("/with/:userId", validate({ params: v.userIdParams }), messages.thread);
messageRouter.post("/", validate({ body: v.messageCreate }), messages.send);

// ---- Image uploads ---------------------------------------------------------
const UPLOAD_DIR = path.join(__dirname, "..", "uploads");
const EXT = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif" };

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, file, cb) => cb(null, `${crypto.randomBytes(16).toString("hex")}${EXT[file.mimetype]}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) =>
    EXT[file.mimetype] ? cb(null, true) : cb(ApiError.badRequest("Only JPG, PNG, WebP or GIF images are allowed")),
});

const uploadRouter = express.Router();
uploadRouter.post("/", protect, (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err?.code === "LIMIT_FILE_SIZE") return next(ApiError.badRequest("Image must be 5 MB or smaller"));
    if (err) return next(err);
    if (!req.file) return next(ApiError.badRequest("No file uploaded"));
    const url = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
    res.status(201).json({ success: true, data: { url } });
  });
});

module.exports = { favoriteRouter, notificationRouter, messageRouter, uploadRouter, UPLOAD_DIR };
