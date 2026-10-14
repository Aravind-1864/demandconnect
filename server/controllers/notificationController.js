const Notification = require("../models/Notification");
const ApiError = require("../utils/ApiError");
const { asyncHandler, assertObjectId, ok } = require("../utils/helpers");

exports.list = asyncHandler(async (req, res) => {
  const [items, unread] = await Promise.all([
    Notification.find({ user: req.user._id }).sort("-createdAt").limit(30).lean(),
    Notification.countDocuments({ user: req.user._id, read: false }),
  ]);
  ok(res, items, 200, { unread });
});

exports.markRead = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id, "Notification");
  const n = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { read: true },
    { returnDocument: "after" }
  );
  if (!n) throw ApiError.notFound("Notification not found");
  ok(res, n);
});

exports.markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
  ok(res, { message: "All notifications marked as read" });
});
