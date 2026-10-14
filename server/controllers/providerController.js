const ProviderProfile = require("../models/ProviderProfile");
const Category = require("../models/Category");
const Review = require("../models/Review");
const User = require("../models/User");
const Booking = require("../models/Booking");
const Proposal = require("../models/Proposal");
const ServiceRequest = require("../models/ServiceRequest");
const { notify } = require("../services/notificationService");
const ApiError = require("../utils/ApiError");
const { asyncHandler, assertObjectId, escapeRegex, dayRange, ok } = require("../utils/helpers");

/** Average hours between a request being posted and this provider's proposal. */
async function responseHours(userId) {
  const [r] = await Proposal.aggregate([
    { $match: { provider: userId } },
    { $lookup: { from: ServiceRequest.collection.name, localField: "request", foreignField: "_id", as: "r" } },
    { $unwind: "$r" },
    { $project: { h: { $divide: [{ $subtract: ["$createdAt", "$r.createdAt"] }, 3600000] } } },
    { $group: { _id: null, avg: { $avg: "$h" }, n: { $sum: 1 } } },
  ]);
  return r ? { hours: Math.max(0, Math.round(r.avg * 10) / 10), samples: r.n } : null;
}

const PUBLIC_POPULATE = [
  { path: "categories", select: "name slug image" },
  { path: "user", select: "name" },
];

async function assertCategoriesExist(ids) {
  if (!ids?.length) return;
  const count = await Category.countDocuments({ _id: { $in: ids }, active: true });
  if (count !== new Set(ids.map(String)).size) throw ApiError.badRequest("One or more categories are invalid");
}

exports.listCategories = asyncHandler(async (_req, res) => {
  ok(res, await Category.find({ active: true }).sort("name"));
});

/** GET /providers — Manual Mode search & filter. */
exports.search = asyncHandler(async (req, res) => {
  const { q, category, location, minPrice, maxPrice, minRating, verified, date, sort, page, limit } = req.query;
  const filter = {};

  if (category) {
    const cat = await Category.findOne({ slug: category.toLowerCase(), active: true }).select("_id");
    if (!cat) return ok(res, [], 200, { pagination: { page, limit, total: 0, pages: 0 } });
    filter.categories = cat._id;
  }
  if (location) {
    const rx = new RegExp(escapeRegex(location), "i");
    filter.$or = [{ location: rx }, { serviceAreas: rx }];
  }
  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.startingPrice = {};
    if (minPrice !== undefined) filter.startingPrice.$gte = minPrice;
    if (maxPrice !== undefined) filter.startingPrice.$lte = maxPrice;
  }
  if (minRating) filter.ratingAverage = { $gte: minRating };
  if (verified) filter.verified = verified === "true";
  if (q) {
    const rx = new RegExp(escapeRegex(q), "i");
    filter.$and = [{ $or: [{ businessName: rx }, { description: rx }, { skills: rx }] }];
  }

  // Hide providers whose accounts were disabled by an admin.
  const activeUsers = await User.find({ role: "PROVIDER", isActive: true }).distinct("_id");
  let allowedUsers = activeUsers;
  if (date) {
    // Only providers who work that weekday, have not blocked the date and have no live booking on it.
    const { start, end } = dayRange(new Date(date));
    const busy = new Set(
      (await Booking.find({ eventDate: { $gte: start, $lt: end }, status: { $in: ["CONFIRMED", "IN_PROGRESS"] } }).distinct("provider")).map(String)
    );
    allowedUsers = activeUsers.filter((id) => !busy.has(String(id)));
    filter["availability.workingDays"] = start.getUTCDay();
    filter["availability.blockedDates"] = { $not: { $elemMatch: { $gte: start, $lt: end } } };
  }
  filter.user = { $in: allowedUsers };

  const sorts = {
    rating: { ratingAverage: -1, ratingCount: -1 },
    price_asc: { startingPrice: 1 },
    price_desc: { startingPrice: -1 },
    newest: { createdAt: -1 },
  };

  const [items, total] = await Promise.all([
    ProviderProfile.find(filter)
      .populate(PUBLIC_POPULATE)
      .sort(sorts[sort])
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    ProviderProfile.countDocuments(filter),
  ]);

  ok(res, items, 200, { pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

exports.getById = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id, "Provider");
  const profile = await ProviderProfile.findById(req.params.id).populate(PUBLIC_POPULATE).lean();
  if (!profile) throw ApiError.notFound("Provider not found");
  const response = await responseHours(profile.user._id);
  delete profile.verification; // private moderation data
  delete profile.proposalTemplates;
  ok(res, { ...profile, avgResponseHours: response ? response.hours : null });
});

exports.getMine = asyncHandler(async (req, res) => {
  const profile = await ProviderProfile.findOne({ user: req.user._id }).populate("categories", "name slug");
  if (!profile) throw ApiError.notFound("You have not created a provider profile yet");
  ok(res, profile);
});

exports.createProfile = asyncHandler(async (req, res) => {
  if (await ProviderProfile.exists({ user: req.user._id })) {
    throw ApiError.conflict("You already have a provider profile");
  }
  await assertCategoriesExist(req.body.categories);

  const profile = await ProviderProfile.create({ ...req.body, user: req.user._id });
  ok(res, await profile.populate("categories", "name slug"), 201);
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const profile = await ProviderProfile.findOne({ user: req.user._id });
  if (!profile) throw ApiError.notFound("Create a provider profile first");

  await assertCategoriesExist(req.body.categories);

  const { availability, ...rest } = req.body;
  profile.set(rest); // body is already whitelisted by the validator
  if (availability) {
    if (availability.workingDays) profile.availability.workingDays = availability.workingDays;
    if (availability.blockedDates) profile.availability.blockedDates = availability.blockedDates;
  }
  await profile.save();
  ok(res, await profile.populate("categories", "name slug"));
});

exports.listReviews = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id, "Provider");
  const reviews = await Review.find({ providerProfile: req.params.id })
    .populate("customer", "name")
    .sort("-createdAt")
    .limit(50)
    .lean();
  ok(res, reviews);
});

/** GET /providers/batch?ids=a,b,c — used by compare and shared shortlists. */
exports.batch = asyncHandler(async (req, res) => {
  const items = await ProviderProfile.find({ _id: { $in: req.query.ids } })
    .populate(PUBLIC_POPULATE)
    .select("-verification -proposalTemplates")
    .lean();
  ok(res, items);
});

/** GET /providers/me/stats — earnings, pipeline and responsiveness for the provider dashboard. */
exports.stats = asyncHandler(async (req, res) => {
  const profile = await ProviderProfile.findOne({ user: req.user._id }).lean();
  if (!profile) throw ApiError.notFound("Create a provider profile first");

  const since = new Date();
  since.setUTCDate(1);
  since.setUTCMonth(since.getUTCMonth() - 5);
  since.setUTCHours(0, 0, 0, 0);

  const [monthly, byStatus, proposals, response] = await Promise.all([
    Booking.aggregate([
      { $match: { provider: req.user._id, status: "COMPLETED", completedAt: { $gte: since } } },
      { $group: { _id: { y: { $year: "$completedAt" }, m: { $month: "$completedAt" } }, total: { $sum: "$agreedPrice" }, count: { $sum: 1 } } },
    ]),
    Booking.aggregate([
      { $match: { provider: req.user._id } },
      { $group: { _id: "$status", count: { $sum: 1 }, value: { $sum: "$agreedPrice" } } },
    ]),
    Proposal.aggregate([{ $match: { provider: req.user._id } }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
    responseHours(req.user._id),
  ]);

  const months = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(Date.UTC(since.getUTCFullYear(), since.getUTCMonth() + i, 1));
    const hit = monthly.find((x) => x._id.y === d.getUTCFullYear() && x._id.m === d.getUTCMonth() + 1);
    months.push({
      label: d.toLocaleString("en-US", { month: "short", timeZone: "UTC" }),
      year: d.getUTCFullYear(),
      total: hit?.total || 0,
      count: hit?.count || 0,
    });
  }

  const bookings = Object.fromEntries(byStatus.map((b) => [b._id, { count: b.count, value: b.value }]));
  const proposalCounts = Object.fromEntries(proposals.map((p) => [p._id, p.count]));
  const sent = Object.values(proposalCounts).reduce((a, b) => a + b, 0);

  ok(res, {
    months,
    bookings,
    proposals: proposalCounts,
    totalEarned: bookings.COMPLETED?.value || 0,
    pipelineValue: (bookings.CONFIRMED?.value || 0) + (bookings.IN_PROGRESS?.value || 0),
    acceptanceRate: sent ? Math.round(((proposalCounts.ACCEPTED || 0) / sent) * 100) : null,
    avgResponseHours: response?.hours ?? null,
  });
});

/** GET /providers/me/calendar — booked and blocked dates for the calendar view. */
exports.calendar = asyncHandler(async (req, res) => {
  const profile = await ProviderProfile.findOne({ user: req.user._id }).lean();
  if (!profile) throw ApiError.notFound("Create a provider profile first");
  const bookings = await Booking.find({ provider: req.user._id, status: { $in: ["CONFIRMED", "IN_PROGRESS", "COMPLETED"] } })
    .populate("request", "title location")
    .select("eventDate status agreedPrice request")
    .lean();
  ok(res, { bookings, blockedDates: profile.availability?.blockedDates || [], workingDays: profile.availability?.workingDays || [] });
});

/** POST /providers/verification — submit a document for admin review. */
exports.submitVerification = asyncHandler(async (req, res) => {
  const profile = await ProviderProfile.findOne({ user: req.user._id });
  if (!profile) throw ApiError.notFound("Create a provider profile first");
  if (profile.verified) throw ApiError.conflict("Your profile is already verified");

  profile.verification = { status: "PENDING", documentUrl: req.body.documentUrl, submittedAt: new Date() };
  await profile.save();

  const admins = await User.find({ role: "ADMIN", isActive: true }).select("_id");
  await Promise.all(
    admins.map((a) =>
      notify(a._id, {
        type: "VERIFICATION",
        title: "Verification request",
        body: profile.businessName + " submitted documents for review",
        link: "/admin",
      })
    )
  );
  ok(res, profile.verification);
});
