const mongoose = require("mongoose");

const BOOKING_STATUSES = ["CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
const ACTIVE_BOOKING_STATUSES = ["CONFIRMED", "IN_PROGRESS", "COMPLETED"];

const bookingSchema = new mongoose.Schema(
  {
    request: { type: mongoose.Schema.Types.ObjectId, ref: "ServiceRequest", required: true },
    proposal: { type: mongoose.Schema.Types.ObjectId, ref: "Proposal", required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    provider: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    providerProfile: { type: mongoose.Schema.Types.ObjectId, ref: "ProviderProfile", required: true },
    agreedPrice: { type: Number, required: true, min: 0 },
    // Copied from the request so provider availability can be checked without a join.
    eventDate: { type: Date, required: true },
    status: { type: String, enum: BOOKING_STATUSES, default: "CONFIRMED", index: true },
    completedAt: Date,
    cancelledAt: Date,
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Database-level guarantee: a request can have only one non-cancelled booking,
// even if two accept calls race.
bookingSchema.index(
  { request: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ACTIVE_BOOKING_STATUSES } } }
);
bookingSchema.index({ provider: 1, eventDate: 1, status: 1 });

module.exports = mongoose.model("Booking", bookingSchema);
module.exports.BOOKING_STATUSES = BOOKING_STATUSES;
module.exports.ACTIVE_BOOKING_STATUSES = ACTIVE_BOOKING_STATUSES;
