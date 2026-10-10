const ProviderProfile = require("../models/ProviderProfile");
const Category = require("../models/Category");
const Review = require("../models/Review");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const { asyncHandler, assertObjectId, escapeRegex, ok } = require("../utils/helpers");

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
  const { q, category, location, minPrice, maxPrice, minRating, verified, sort, page, limit } = req.query;
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
  filter.user = { $in: activeUsers };

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
  ok(res, profile);
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
