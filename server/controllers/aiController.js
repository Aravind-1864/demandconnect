const Category = require("../models/Category");
const ProviderProfile = require("../models/ProviderProfile");
const Booking = require("../models/Booking");
const Proposal = require("../models/Proposal");
const User = require("../models/User");
const { ACTIVE_BOOKING_STATUSES } = require("../models/Booking");
const { asyncHandler, dayKey, dayRange, ok } = require("../utils/helpers");
const ai = require("../services/aiService");
const matching = require("../services/matchingService");
const { loadOwned } = require("./requestController");

/** POST /ai/parse-requirement — free text → editable structured fields. */
exports.parseRequirement = asyncHandler(async (req, res) => {
  const categories = await Category.find({ active: true }).select("name slug").lean();
  const providerPlaces = await ProviderProfile.find().select("location serviceAreas").lean();
  const locations = [...new Set(providerPlaces.flatMap((p) => [p.location, ...(p.serviceAreas || [])]))].filter(Boolean);

  const { parsed, source, warning } = await ai.parseRequirement(req.body.text, { categories, locations });

  // Map AI category names onto real category ids; drop anything unknown.
  const byName = new Map(categories.map((c) => [c.name.toLowerCase(), c]));
  const services = parsed.services
    .map((s) => ({ category: byName.get(s.category.toLowerCase()), requirements: s.requirements }))
    .filter((s) => s.category)
    .map((s) => ({ category: String(s.category._id), categoryName: s.category.name, requirements: s.requirements }));

  ok(res, { ...parsed, services, source, warning: warning || null });
});

/** POST /ai/recommendations — rank real providers against a saved request. */
exports.recommendations = asyncHandler(async (req, res) => {
  const request = await loadOwned(req.body.requestId, req.user);
  await request.populate("services.category", "name");

  const categoryIds = request.services.map((s) => s.category._id);
  const requirement = {
    categoryIds,
    categoryNames: request.services.map((s) => s.category.name),
    requirements: request.services.flatMap((s) => s.requirements),
    location: request.location,
    eventDate: request.eventDate,
    budgetMax: request.budgetMax,
  };

  const activeProviderIds = await User.find({ role: "PROVIDER", isActive: true }).distinct("_id");
  const candidates = await ProviderProfile.find({ categories: { $in: categoryIds }, user: { $in: activeProviderIds } })
    .populate("categories", "name slug")
    .lean();

  // Days on which each candidate already has a live booking.
  const { start, end } = dayRange(request.eventDate);
  const busy = await Booking.find({
    provider: { $in: candidates.map((c) => c.user) },
    eventDate: { $gte: start, $lt: end },
    status: { $in: ACTIVE_BOOKING_STATUSES.filter((s) => s !== "COMPLETED") },
  })
    .select("provider eventDate")
    .lean();
  const busyByProvider = new Map();
  for (const b of busy) {
    const key = String(b.provider);
    if (!busyByProvider.has(key)) busyByProvider.set(key, new Set());
    busyByProvider.get(key).add(dayKey(b.eventDate));
  }

  const { matches, excluded } = matching.rankProviders(candidates, requirement, { busyByProvider });

  const shape = (e) => ({
    provider: {
      _id: e.provider._id,
      businessName: e.provider.businessName,
      location: e.provider.location,
      categories: e.provider.categories,
      startingPrice: e.provider.startingPrice,
      ratingAverage: e.provider.ratingAverage,
      ratingCount: e.provider.ratingCount,
      verified: e.provider.verified,
      skills: e.provider.skills,
      coverImage: e.provider.coverImage,
      portfolio: (e.provider.portfolio || []).slice(0, 1),
    },
    score: e.score,
    breakdown: e.breakdown,
    explanation: e.explanation,
    reasons: e.reasons,
  });

  ok(res, {
    weights: matching.WEIGHTS,
    matches: matches.map(shape),
    excluded: excluded.map(shape),
  });
});

/** POST /ai/compare-proposals — facts always; narrative only when AI is configured. */
exports.compareProposals = asyncHandler(async (req, res) => {
  const request = await loadOwned(req.body.requestId, req.user);
  const proposals = await Proposal.find({ request: request._id, status: "PENDING" })
    .populate("providerProfile", "businessName ratingAverage ratingCount")
    .lean();

  if (proposals.length === 0) return ok(res, { facts: null, summary: null, count: 0 });

  ok(res, {
    count: proposals.length,
    facts: ai.buildComparison(proposals, request),
    summary: await ai.summarizeProposals(proposals, request),
  });
});
