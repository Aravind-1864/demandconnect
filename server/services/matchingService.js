/**
 * Rule-based provider matching.
 *
 * Deliberately free of I/O: every function here is pure, so the scoring is
 * deterministic and unit-testable. The AI layer only *interprets* customer
 * language and *explains* results — it never decides who matches.
 *
 *   matchScore = Σ weight_i × score_i      (each score_i in 0…100)
 */
const { dayKey } = require("../utils/helpers");

const WEIGHTS = Object.freeze({
  skills: 0.3,
  location: 0.2,
  availability: 0.2,
  budget: 0.2,
  experience: 0.1,
});

const STOPWORDS = new Set([
  "and", "the", "for", "with", "need", "needs", "want", "service", "services",
  "event", "style", "styles", "photography", "photographer", "catering",
]);

const norm = (s) => String(s || "").toLowerCase().trim();
const round = (n) => Math.round(n * 10) / 10;

const tokens = (text, extraStop = new Set()) =>
  norm(text)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t) && !extraStop.has(t));

/** Fraction (0–100) of requested requirements the provider's skills/description cover. */
function scoreSkills(provider, requirements = [], categoryWords = new Set()) {
  const wanted = requirements.map((r) => r.trim()).filter(Boolean);
  if (wanted.length === 0) return { score: 100, matched: [], missing: [] };

  const haystack = [provider.businessName, provider.description, ...(provider.skills || [])]
    .map(norm)
    .join(" ");
  const haystackTokens = new Set(tokens(haystack));

  const matched = [];
  const missing = [];
  let total = 0;

  for (const req of wanted) {
    const reqTokens = tokens(req, categoryWords);
    let fraction;
    if (reqTokens.length === 0) {
      // Only generic words (e.g. "photography") — satisfied by being in the category.
      fraction = 1;
    } else {
      const hits = reqTokens.filter(
        (t) => haystackTokens.has(t) || [...haystackTokens].some((h) => h.startsWith(t) || t.startsWith(h))
      ).length;
      fraction = hits / reqTokens.length;
    }
    total += fraction;
    (fraction >= 0.5 ? matched : missing).push(req);
  }

  return { score: (total / wanted.length) * 100, matched, missing };
}

function locationMatches(provider, location) {
  const target = norm(location);
  if (!target) return true;
  const places = [provider.location, ...(provider.serviceAreas || [])].map(norm);
  return places.some((p) => p && (p === target || p.includes(target) || target.includes(p)));
}

/** Returns { available, reason } for a provider on `eventDate`. */
function checkAvailability(provider, eventDate, busyDays = new Set()) {
  if (!eventDate) return { available: true };
  const date = new Date(eventDate);
  const key = dayKey(date);
  const { workingDays = [0, 1, 2, 3, 4, 5, 6], blockedDates = [] } = provider.availability || {};

  if (blockedDates.some((d) => dayKey(d) === key)) {
    return { available: false, reason: "Marked unavailable on the event date" };
  }
  if (!workingDays.includes(date.getUTCDay())) {
    return { available: false, reason: "Does not work on this day of the week" };
  }
  if (busyDays.has(key)) {
    return { available: false, reason: "Already booked on the event date" };
  }
  return { available: true };
}

function scoreBudget(provider, budgetMax) {
  if (!budgetMax) return { score: 100, fits: true };
  const price = provider.startingPrice || 0;
  if (price <= 0) return { score: 70, fits: true, unknownPrice: true };
  if (price > budgetMax) return { score: 0, fits: false };
  const ratio = price / budgetMax;
  // Comfortably under budget → 100, right at the limit → 80.
  const score = ratio <= 0.8 ? 100 : 100 - ((ratio - 0.8) / 0.2) * 20;
  return { score, fits: true };
}

function scoreExperience(provider) {
  const rating = provider.ratingCount > 0 ? (provider.ratingAverage / 5) * 100 : 50;
  const exp = (Math.min(provider.experienceYears || 0, 10) / 10) * 100;
  return rating * 0.7 + exp * 0.3;
}

/**
 * Evaluates one provider against a requirement.
 * @param provider  plain provider profile (with categories as ids or populated docs)
 * @param req       { categoryIds, requirements, categoryNames, location, eventDate, budgetMax }
 * @param ctx       { busyDays: Set<'YYYY-MM-DD'> }
 */
function evaluateProvider(provider, req, ctx = {}) {
  const reasons = [];

  const providerCats = (provider.categories || []).map((c) => String(c._id || c));
  const wantedCats = (req.categoryIds || []).map(String);
  const categoryOk = wantedCats.length === 0 || wantedCats.some((c) => providerCats.includes(c));
  if (!categoryOk) reasons.push("Does not offer the requested service");

  const locationOk = locationMatches(provider, req.location);
  if (!locationOk) reasons.push(`Does not serve ${req.location}`);

  const availability = checkAvailability(provider, req.eventDate, ctx.busyDays);
  if (!availability.available) reasons.push(availability.reason);

  const budget = scoreBudget(provider, req.budgetMax);
  if (!budget.fits) reasons.push("Starting price is above the budget");

  const categoryWords = new Set((req.categoryNames || []).flatMap((n) => tokens(n)));
  const skills = scoreSkills(provider, req.requirements, categoryWords);

  const breakdown = {
    skills: round(skills.score),
    location: locationOk ? 100 : 0,
    availability: availability.available ? 100 : 0,
    budget: round(budget.score),
    experience: round(scoreExperience(provider)),
  };

  const score = round(
    Object.entries(WEIGHTS).reduce((sum, [k, w]) => sum + w * breakdown[k], 0)
  );

  return {
    eligible: reasons.length === 0,
    reasons,
    score,
    breakdown,
    details: { matchedSkills: skills.matched, missingSkills: skills.missing },
  };
}

/** Plain-language explanation built only from verified facts. */
function explain(provider, evaluation, req = {}) {
  const parts = [];
  const { breakdown, details } = evaluation;

  if (details.matchedSkills.length) {
    parts.push(`Covers ${details.matchedSkills.join(", ")}`);
  }
  if (details.missingSkills.length) {
    parts.push(`No clear match for ${details.missingSkills.join(", ")}`);
  }
  if (req.location && breakdown.location === 100) parts.push(`serves ${req.location}`);
  if (req.eventDate && breakdown.availability === 100) parts.push("available on your date");
  if (provider.startingPrice > 0) {
    parts.push(
      req.budgetMax
        ? `starts at ₹${provider.startingPrice.toLocaleString("en-IN")} (budget ₹${req.budgetMax.toLocaleString("en-IN")})`
        : `starts at ₹${provider.startingPrice.toLocaleString("en-IN")}`
    );
  }
  if (provider.ratingCount > 0) {
    parts.push(`rated ${provider.ratingAverage.toFixed(1)}/5 from ${provider.ratingCount} review${provider.ratingCount > 1 ? "s" : ""}`);
  } else {
    parts.push("no reviews yet");
  }
  if (provider.verified) parts.push("verified by DemandConnect");

  const sentence = parts.join("; ");
  return sentence.charAt(0).toUpperCase() + sentence.slice(1) + ".";
}

/**
 * Evaluates all candidates and splits them into ranked matches and excluded.
 * Ties are broken by rating, then lower starting price, so ordering is stable.
 */
function rankProviders(providers, req, ctx = {}) {
  const matches = [];
  const excluded = [];

  for (const provider of providers) {
    const key = String(provider.user?._id || provider.user || provider._id);
    const busyDays = ctx.busyByProvider?.get(key) || new Set();
    const evaluation = evaluateProvider(provider, req, { busyDays });
    const entry = { provider, ...evaluation, explanation: explain(provider, evaluation, req) };
    (evaluation.eligible ? matches : excluded).push(entry);
  }

  matches.sort(
    (a, b) =>
      b.score - a.score ||
      (b.provider.ratingAverage || 0) - (a.provider.ratingAverage || 0) ||
      (a.provider.startingPrice || 0) - (b.provider.startingPrice || 0)
  );

  return { matches, excluded };
}

module.exports = {
  WEIGHTS,
  scoreSkills,
  checkAvailability,
  scoreBudget,
  scoreExperience,
  evaluateProvider,
  explain,
  rankProviders,
};
