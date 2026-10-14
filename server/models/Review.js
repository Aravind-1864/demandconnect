const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true, unique: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    provider: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    providerProfile: { type: mongoose.Schema.Types.ObjectId, ref: "ProviderProfile", required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 1000, default: "" },
    photos: [{ type: String, trim: true }],
    reply: {
      text: { type: String, trim: true, maxlength: 1000 },
      createdAt: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Review", reviewSchema);
