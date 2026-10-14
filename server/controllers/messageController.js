const Message = require("../models/Message");
const User = require("../models/User");
const ProviderProfile = require("../models/ProviderProfile");
const ApiError = require("../utils/ApiError");
const { asyncHandler, assertObjectId, ok } = require("../utils/helpers");
const { emitToUser } = require("../services/realtime");

const convoId = (a, b) => [String(a), String(b)].sort().join("_");

async function userCard(user) {
  const profile = user.role === "PROVIDER" ? await ProviderProfile.findOne({ user: user._id }).select("businessName coverImage").lean() : null;
  return {
    _id: user._id,
    name: user.name,
    role: user.role,
    businessName: profile?.businessName || null,
    profileId: profile?._id || null,
    avatar: profile?.coverImage || null,
  };
}

/** Threads for the sidebar: one entry per counterpart with last message and unread count. */
exports.conversations = asyncHandler(async (req, res) => {
  const me = req.user._id;
  const messages = await Message.find({ $or: [{ sender: me }, { recipient: me }] })
    .sort("-createdAt")
    .limit(500)
    .lean();

  const threads = new Map();
  for (const m of messages) {
    const other = String(m.sender) === String(me) ? String(m.recipient) : String(m.sender);
    if (!threads.has(other)) threads.set(other, { other, last: m, unread: 0 });
    if (String(m.recipient) === String(me) && !m.readAt) threads.get(other).unread += 1;
  }

  const users = await User.find({ _id: { $in: [...threads.keys()] } });
  const cards = new Map();
  for (const u of users) cards.set(String(u._id), await userCard(u));

  ok(
    res,
    [...threads.values()]
      .filter((t) => cards.has(t.other))
      .map((t) => ({ user: cards.get(t.other), last: { text: t.last.text, createdAt: t.last.createdAt, mine: String(t.last.sender) === String(me) }, unread: t.unread }))
  );
});

exports.unreadCount = asyncHandler(async (req, res) => {
  ok(res, { count: await Message.countDocuments({ recipient: req.user._id, readAt: null }) });
});

exports.thread = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  assertObjectId(userId, "User");
  const other = await User.findById(userId);
  if (!other) throw ApiError.notFound("User not found");

  const messages = await Message.find({ conversationId: convoId(req.user._id, userId) }).sort("createdAt").limit(300).lean();
  await Message.updateMany({ conversationId: convoId(req.user._id, userId), recipient: req.user._id, readAt: null }, { readAt: new Date() });

  ok(res, { user: await userCard(other), messages });
});

exports.send = asyncHandler(async (req, res) => {
  const { recipient, text } = req.body;
  const other = await User.findById(recipient);
  if (!other || !other.isActive) throw ApiError.notFound("Recipient not found");

  // Conversations are strictly customer ↔ provider.
  const pair = [req.user.role, other.role].sort().join("-");
  if (pair !== "CUSTOMER-PROVIDER") throw ApiError.forbidden("You can only message between customers and providers");

  const message = await Message.create({
    conversationId: convoId(req.user._id, recipient),
    sender: req.user._id,
    recipient,
    text,
  });

  const payload = message.toObject();
  emitToUser(recipient, "message", payload);
  emitToUser(req.user._id, "message", payload); // sync the sender's other tabs
  ok(res, payload, 201);
});
