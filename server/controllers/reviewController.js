const mongoose = require("mongoose");
const Review = require("../models/Review");
const Booking = require("../models/Booking");
const ProviderProfile = require("../models/ProviderProfile");
const ApiError = require("../utils/ApiError");
const { asyncHandler, assertObjectId, ok } = require("../utils/helpers");

/** Recomputes the denormalised rating from the source-of-truth reviews. */
async function refreshRating(providerProfileId) {
  const [stats] = await Review.aggregate([
    { $match: { providerProfile: new mongoose.Types.ObjectId(providerProfileId) } },
    { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  await ProviderProfile.updateOne(
    { _id: providerProfileId },
    { ratingAverage: stats ? Math.round(stats.avg * 10) / 10 : 0, ratingCount: stats?.count || 0 }
  );
}

exports.create = asyncHandler(async (req, res) => {
  const { booking: bookingId, rating, comment } = req.body;
  assertObjectId(bookingId, "Booking");

  const booking = await Booking.findById(bookingId);
  if (!booking || String(booking.customer) !== String(req.user._id)) throw ApiError.notFound("Booking not found");
  if (booking.status !== "COMPLETED") throw ApiError.conflict("You can only review a completed booking");

  // The unique index on `booking` makes this race-safe; the pre-check gives a friendly message.
  if (await Review.exists({ booking: booking._id })) throw ApiError.conflict("You have already reviewed this booking");

  const review = await Review.create({
    booking: booking._id,
    customer: req.user._id,
    provider: booking.provider,
    providerProfile: booking.providerProfile,
    rating,
    comment,
  });
  await refreshRating(booking.providerProfile);

  ok(res, review, 201);
});

exports.refreshRating = refreshRating;
