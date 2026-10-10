const mongoose = require("mongoose");

const PROPOSAL_STATUSES = ["PENDING", "ACCEPTED", "REJECTED", "WITHDRAWN"];

const proposalSchema = new mongoose.Schema(
  {
    request: { type: mongoose.Schema.Types.ObjectId, ref: "ServiceRequest", required: true, index: true },
    provider: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    providerProfile: { type: mongoose.Schema.Types.ObjectId, ref: "ProviderProfile", required: true },
    proposedPrice: { type: Number, required: true, min: 1 },
    includedServices: [{ type: String, trim: true, maxlength: 120 }],
    exclusions: [{ type: String, trim: true, maxlength: 120 }],
    message: { type: String, trim: true, maxlength: 1500, default: "" },
    status: { type: String, enum: PROPOSAL_STATUSES, default: "PENDING", index: true },
  },
  { timestamps: true }
);

// One live proposal per provider per request.
proposalSchema.index({ request: 1, provider: 1 }, { unique: true });

module.exports = mongoose.model("Proposal", proposalSchema);
module.exports.PROPOSAL_STATUSES = PROPOSAL_STATUSES;
