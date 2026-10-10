const mongoose = require("mongoose");

const providerProfileSchema = new mongoose.Schema(
  {
    // A provider is a User with role PROVIDER plus exactly one profile.
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    businessName: { type: String, required: true, trim: true, maxlength: 100 },
    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
    description: { type: String, trim: true, maxlength: 2000, default: "" },
    location: { type: String, required: true, trim: true, maxlength: 80 },
    serviceAreas: [{ type: String, trim: true }],
    startingPrice: { type: Number, min: 0, default: 0 },
    skills: [{ type: String, trim: true }],
    coverImage: { type: String, trim: true, default: "" },
    portfolio: [{ type: String, trim: true }],
    experienceYears: { type: Number, min: 0, max: 60, default: 0 },

    // Availability: which weekdays the provider works (0 = Sunday … 6 = Saturday)
    // and specific dates they have blocked off. Confirmed bookings are checked
    // separately by the matching service.
    availability: {
      workingDays: { type: [Number], default: [0, 1, 2, 3, 4, 5, 6] },
      blockedDates: { type: [Date], default: [] },
    },

    // Denormalised from reviews; recomputed whenever a review is created.
    ratingAverage: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },
    verified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

providerProfileSchema.index({ categories: 1, location: 1 });
providerProfileSchema.index({ serviceAreas: 1 });
providerProfileSchema.index({ businessName: "text", description: "text", skills: "text" });

module.exports = mongoose.model("ProviderProfile", providerProfileSchema);
