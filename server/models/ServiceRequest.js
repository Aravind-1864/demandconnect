const mongoose = require("mongoose");

const REQUEST_STATUSES = ["OPEN", "BOOKED", "COMPLETED", "CANCELLED"];

const serviceRequestSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    eventType: { type: String, required: true, trim: true, maxlength: 60 },
    location: { type: String, required: true, trim: true, maxlength: 80 },
    eventDate: { type: Date, required: true },
    duration: { type: Number, min: 0, default: 0 }, // hours
    guestCount: { type: Number, min: 0, default: 0 },
    budgetMin: { type: Number, min: 0, default: 0 },
    budgetMax: { type: Number, min: 0, default: 0 },
    services: {
      type: [
        {
          _id: false,
          category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
          requirements: [{ type: String, trim: true, maxlength: 120 }],
        },
      ],
      validate: [(v) => v.length > 0, "At least one service is required"],
    },
    description: { type: String, trim: true, maxlength: 2000, default: "" },
    status: { type: String, enum: REQUEST_STATUSES, default: "OPEN", index: true },
    mode: { type: String, enum: ["MANUAL", "AI"], default: "MANUAL" },
    // Providers the customer explicitly asked to quote (Manual / AI mode "send request").
    invitedProviders: [{ type: mongoose.Schema.Types.ObjectId, ref: "ProviderProfile" }],
  },
  { timestamps: true }
);

serviceRequestSchema.index({ status: 1, eventDate: 1 });
serviceRequestSchema.index({ "services.category": 1 });

module.exports = mongoose.model("ServiceRequest", serviceRequestSchema);
module.exports.REQUEST_STATUSES = REQUEST_STATUSES;
