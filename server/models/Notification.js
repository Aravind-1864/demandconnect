const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, required: true }, // PROPOSAL, PROPOSAL_ACCEPTED, BOOKING, REVIEW, INVITE, VERIFICATION …
    title: { type: String, required: true, maxlength: 140 },
    body: { type: String, default: "", maxlength: 300 },
    link: { type: String, default: "" },
    read: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

notificationSchema.index({ user: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
