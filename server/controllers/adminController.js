const User = require("../models/User");
const ProviderProfile = require("../models/ProviderProfile");
const Category = require("../models/Category");
const ServiceRequest = require("../models/ServiceRequest");
const Proposal = require("../models/Proposal");
const Booking = require("../models/Booking");
const ApiError = require("../utils/ApiError");
const { asyncHandler, assertObjectId, ok } = require("../utils/helpers");

const slugify = (s) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

exports.stats = asyncHandler(async (_req, res) => {
  const [users, providers, unverified, requests, openRequests, proposals, bookings, revenue] = await Promise.all([
    User.countDocuments(),
    ProviderProfile.countDocuments(),
    ProviderProfile.countDocuments({ verified: false }),
    ServiceRequest.countDocuments(),
    ServiceRequest.countDocuments({ status: "OPEN" }),
    Proposal.countDocuments(),
    Booking.countDocuments(),
    Booking.aggregate([
      { $match: { status: { $in: ["CONFIRMED", "IN_PROGRESS", "COMPLETED"] } } },
      { $group: { _id: null, total: { $sum: "$agreedPrice" } } },
    ]),
  ]);
  ok(res, {
    users, providers, unverifiedProviders: unverified, requests, openRequests, proposals, bookings,
    bookedValue: revenue[0]?.total || 0,
  });
});

exports.listUsers = asyncHandler(async (_req, res) => {
  ok(res, await User.find().sort("-createdAt").limit(200).lean());
});

exports.setUserActive = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id, "User");
  if (String(req.params.id) === String(req.user._id)) throw ApiError.badRequest("You cannot disable your own account");
  const user = await User.findByIdAndUpdate(req.params.id, { isActive: req.body.isActive }, { returnDocument: "after" });
  if (!user) throw ApiError.notFound("User not found");
  ok(res, user);
});

exports.listProviders = asyncHandler(async (_req, res) => {
  ok(res, await ProviderProfile.find().populate("user", "name email isActive").sort("verified -createdAt").lean());
});

exports.setProviderVerified = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id, "Provider");
  const profile = await ProviderProfile.findByIdAndUpdate(req.params.id, { verified: req.body.verified }, { returnDocument: "after" });
  if (!profile) throw ApiError.notFound("Provider not found");
  ok(res, profile);
});

exports.listCategories = asyncHandler(async (_req, res) => ok(res, await Category.find().sort("name")));

exports.createCategory = asyncHandler(async (req, res) => {
  const slug = slugify(req.body.name);
  if (!slug) throw ApiError.badRequest("Category name is invalid");
  ok(res, await Category.create({ ...req.body, slug }), 201);
});

exports.updateCategory = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id, "Category");
  const update = { ...req.body };
  if (update.name) update.slug = slugify(update.name);
  const category = await Category.findByIdAndUpdate(req.params.id, update, { returnDocument: "after", runValidators: true });
  if (!category) throw ApiError.notFound("Category not found");
  ok(res, category);
});
