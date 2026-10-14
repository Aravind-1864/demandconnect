const User = require("../models/User");
const ProviderProfile = require("../models/ProviderProfile");
const Category = require("../models/Category");
const ServiceRequest = require("../models/ServiceRequest");
const Proposal = require("../models/Proposal");
const Booking = require("../models/Booking");
const ApiError = require("../utils/ApiError");
const { notify } = require("../services/notificationService");
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
  const profile = await ProviderProfile.findById(req.params.id);
  if (!profile) throw ApiError.notFound("Provider not found");

  const wasPending = profile.verification?.status === "PENDING";
  profile.verified = req.body.verified;
  if (req.body.verified) profile.verification.status = "APPROVED";
  else if (wasPending) profile.verification.status = "REJECTED";
  else profile.verification.status = "NONE";
  await profile.save();

  await notify(profile.user, {
    type: "VERIFICATION",
    title: req.body.verified ? "You are now verified ✓" : wasPending ? "Verification not approved" : "Verification removed",
    body: req.body.verified
      ? "Your profile now shows the Verified badge."
      : "Please review your documents and submit again.",
    link: "/provider/profile",
  });
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

exports.analytics = asyncHandler(async (_req, res) => {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 13);
  since.setUTCHours(0, 0, 0, 0);

  const [daily, byCategory, top] = await Promise.all([
    ServiceRequest.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
    ]),
    ServiceRequest.aggregate([
      { $unwind: "$services" },
      { $group: { _id: "$services.category", count: { $sum: 1 } } },
      { $lookup: { from: Category.collection.name, localField: "_id", foreignField: "_id", as: "c" } },
      { $unwind: "$c" },
      { $project: { _id: 0, name: "$c.name", count: 1 } },
      { $sort: { count: -1 } },
    ]),
    Booking.aggregate([
      { $match: { status: "COMPLETED" } },
      { $group: { _id: "$providerProfile", jobs: { $sum: 1 }, value: { $sum: "$agreedPrice" } } },
      { $sort: { value: -1 } },
      { $limit: 5 },
      { $lookup: { from: ProviderProfile.collection.name, localField: "_id", foreignField: "_id", as: "p" } },
      { $unwind: "$p" },
      { $project: { _id: 1, jobs: 1, value: 1, businessName: "$p.businessName", ratingAverage: "$p.ratingAverage" } },
    ]),
  ]);

  const byDay = new Map(daily.map((d) => [d._id, d.count]));
  const days = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(since);
    d.setUTCDate(since.getUTCDate() + i);
    const key = d.toISOString().slice(0, 10);
    days.push({ date: key, count: byDay.get(key) || 0 });
  }
  ok(res, { requestsByDay: days, byCategory, topProviders: top });
});
