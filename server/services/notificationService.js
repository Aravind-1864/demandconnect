const Notification = require("../models/Notification");
const { emitToUser } = require("./realtime");

/**
 * Creates an in-app notification and pushes it to the user's open sessions.
 * Never throws: a failed notification must not fail the business operation.
 */
async function notify(userId, { type, title, body = "", link = "" }) {
  try {
    const doc = await Notification.create({ user: userId, type, title, body, link });
    emitToUser(userId, "notification", doc.toObject());
    return doc;
  } catch (err) {
    console.warn("[notify] failed:", err.message);
    return null;
  }
}

module.exports = { notify };
