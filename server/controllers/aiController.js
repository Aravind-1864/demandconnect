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

/**
 * POST /ai/packages — builds complete vendor bundles for a multi-service event.
 * Each service is matched independently with the same transparent scoring, then
 * bundles are assembled by strategy. Totals use starting prices, so they are estimates.
 */
exports.packages = asyncHandler(async (req, res) => {
  const request = await loadOwned(req.body.requestId, req.user);
  await request.populate("services.category", "name");

  const activeProviderIds = await User.find({ role: "PROVIDER", isActive: true }).distinct("_id");
  const { start, end } = dayRange(request.eventDate);

  const perService = [];
  for (const service of request.services) {
    const categoryId = service.category._id;
    const candidates = await ProviderProfile.find({ categories: categoryId, user: { $in: activeProviderIds } })
      .populate("categories", "name slug")
      .lean();

    const busy = await Booking.find({
      provider: { $in: candidates.map((c) => c.user) },
      eventDate: { $gte: start, $lt: end },
      status: { $in: ["CONFIRMED", "IN_PROGRESS"] },
    })
      .select("provider eventDate")
      .lean();
    const busyByProvider = new Map();
    for (const b of busy) {
      const key = String(b.provider);
      if (!busyByProvider.has(key)) busyByProvider.set(key, new Set());
      busyByProvider.get(key).add(dayKey(b.eventDate));
    }

    const { matches } = matching.rankProviders(
      candidates,
      {
        categoryIds: [categoryId],
        categoryNames: [service.category.name],
        requirements: service.requirements,
        location: request.location,
        eventDate: request.eventDate,
        budgetMax: request.budgetMax,
      },
      { busyByProvider }
    );
    perService.push({ category: service.category.name, matches });
  }

  const pick = {
    BEST_MATCH: (m) => m[0],
    BEST_VALUE: (m) => {
      const decent = m.filter((x) => x.score >= 60);
      return [...(decent.length ? decent : m)].sort(
        (a, b) => (a.provider.startingPrice || 0) - (b.provider.startingPrice || 0) || b.score - a.score
      )[0];
    },
    TOP_RATED: (m) =>
      [...m].sort(
        (a, b) =>
          (b.provider.ratingCount ? b.provider.ratingAverage : 0) - (a.provider.ratingCount ? a.provider.ratingAverage : 0) ||
          b.score - a.score
      )[0],
  };
  const labels = {
    BEST_MATCH: "Best match",
    BEST_VALUE: "Best value",
    TOP_RATED: "Top rated",
  };

  const seen = new Set();
  const packages = [];
  for (const key of Object.keys(pick)) {
    const items = [];
    const missing = [];
    for (const s of perService) {
      const chosen = s.matches.length ? pick[key](s.matches) : null;
      if (!chosen) missing.push(s.category);
      else items.push({ service: s.category, score: chosen.score, explanation: chosen.explanation, provider: chosen.provider });
    }
    if (items.length === 0) continue;

    const signature = items.map((i) => String(i.provider._id)).join("|");
    if (seen.has(signature)) continue;
    seen.add(signature);

    // A provider covering two services is only counted once.
    const unique = new Map(items.map((i) => [String(i.provider._id), i.provider.startingPrice || 0]));
    const total = [...unique.values()].reduce((a, b) => a + b, 0);

    packages.push({
      key,
      label: labels[key],
      total,
      withinBudget: request.budgetMax ? total <= request.budgetMax : null,
      avgScore: Math.round((items.reduce((a, i) => a + i.score, 0) / items.length) * 10) / 10,
      missing,
      items: items.map((i) => ({
        service: i.service,
        score: i.score,
        explanation: i.explanation,
        provider: {
          _id: i.provider._id,
          businessName: i.provider.businessName,
          location: i.provider.location,
          startingPrice: i.provider.startingPrice,
          ratingAverage: i.provider.ratingAverage,
          ratingCount: i.provider.ratingCount,
          verified: i.provider.verified,
          coverImage: i.provider.coverImage,
          portfolio: (i.provider.portfolio || []).slice(0, 1),
          categories: i.provider.categories,
        },
      })),
    });
  }

  ok(res, { budgetMax: request.budgetMax, packages });
});
