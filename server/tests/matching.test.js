const { test } = require("node:test");
const assert = require("node:assert/strict");
const m = require("../services/matchingService");
const { ruleBasedParse } = require("../services/aiService");

const photoCat = "507f1f77bcf86cd799439011";

const provider = (over = {}) => ({
  _id: "p1",
  user: "u1",
  businessName: "Frame Studios",
  categories: [photoCat],
  description: "Wedding photographers",
  location: "Hyderabad",
  serviceAreas: ["Hyderabad"],
  startingPrice: 30000,
  skills: ["Candid photography", "Traditional photography"],
  experienceYears: 10,
  ratingAverage: 4.5,
  ratingCount: 10,
  availability: { workingDays: [0, 1, 2, 3, 4, 5, 6], blockedDates: [] },
  ...over,
});

const requirement = {
  categoryIds: [photoCat],
  categoryNames: ["Photography"],
  requirements: ["Candid photography", "Traditional photography"],
  location: "Hyderabad",
  eventDate: "2026-12-20",
  budgetMax: 50000,
};

test("weights sum to 100%", () => {
  const total = Object.values(m.WEIGHTS).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(total - 1) < 1e-9);
});

test("fully matching provider is eligible with a high score", () => {
  const r = m.evaluateProvider(provider(), requirement);
  assert.equal(r.eligible, true);
  assert.equal(r.breakdown.skills, 100);
  assert.equal(r.breakdown.location, 100);
  assert.equal(r.breakdown.availability, 100);
  assert.ok(r.score > 85, `score was ${r.score}`);
});

test("score equals the weighted sum of the breakdown", () => {
  const r = m.evaluateProvider(provider(), requirement);
  const expected = Object.entries(m.WEIGHTS).reduce((s, [k, w]) => s + w * r.breakdown[k], 0);
  assert.ok(Math.abs(r.score - expected) < 0.1);
});

test("provider outside the service area is ineligible", () => {
  const r = m.evaluateProvider(provider({ location: "Bengaluru", serviceAreas: ["Bengaluru"] }), requirement);
  assert.equal(r.eligible, false);
  assert.match(r.reasons.join(" "), /Does not serve/);
});

test("provider over budget is ineligible", () => {
  const r = m.evaluateProvider(provider({ startingPrice: 90000 }), requirement);
  assert.equal(r.eligible, false);
  assert.equal(r.breakdown.budget, 0);
});

test("blocked date makes provider unavailable", () => {
  const p = provider({ availability: { workingDays: [0, 1, 2, 3, 4, 5, 6], blockedDates: [new Date("2026-12-20")] } });
  const r = m.evaluateProvider(p, requirement);
  assert.equal(r.eligible, false);
  assert.equal(r.breakdown.availability, 0);
});

test("non-working weekday makes provider unavailable", () => {
  // 2026-12-20 is a Sunday (0)
  const p = provider({ availability: { workingDays: [1, 2, 3, 4, 5], blockedDates: [] } });
  assert.equal(m.evaluateProvider(p, requirement).eligible, false);
});

test("existing booking on the date makes provider unavailable", () => {
  const r = m.evaluateProvider(provider(), requirement, { busyDays: new Set(["2026-12-20"]) });
  assert.equal(r.eligible, false);
});

test("provider in a different category is ineligible", () => {
  const r = m.evaluateProvider(provider({ categories: ["507f1f77bcf86cd799439099"] }), requirement);
  assert.equal(r.eligible, false);
});

test("missing skills lower the skills score but do not exclude", () => {
  const r = m.evaluateProvider(provider({ skills: ["Candid photography"], description: "" }), requirement);
  assert.equal(r.eligible, true);
  assert.equal(r.breakdown.skills, 50);
  assert.deepEqual(r.details.missingSkills, ["Traditional photography"]);
});

test("rankProviders orders by score and separates excluded providers", () => {
  const strong = provider({ _id: "a", user: "ua" });
  const weaker = provider({ _id: "b", user: "ub", skills: ["Candid photography"], description: "", ratingCount: 0, ratingAverage: 0 });
  const wrongCity = provider({ _id: "c", user: "uc", location: "Pune", serviceAreas: ["Pune"] });
  const { matches, excluded } = m.rankProviders([weaker, wrongCity, strong], requirement);
  assert.deepEqual(matches.map((x) => x.provider._id), ["a", "b"]);
  assert.deepEqual(excluded.map((x) => x.provider._id), ["c"]);
  assert.ok(matches[0].score > matches[1].score);
});

test("no requirements and no budget does not penalise a provider", () => {
  const r = m.evaluateProvider(provider(), { categoryIds: [photoCat], requirements: [] });
  assert.equal(r.breakdown.skills, 100);
  assert.equal(r.breakdown.budget, 100);
});

test("rule-based parser extracts budget, date, city and category", () => {
  const text =
    "I need a wedding photographer in Hyderabad on 20 December 2026. My budget is ₹50,000. I need candid and traditional photography.";
  const parsed = ruleBasedParse(text, {
    categories: [{ name: "Photography", slug: "photography" }],
    locations: ["Hyderabad", "Pune"],
  });
  assert.equal(parsed.eventType, "Wedding");
  assert.equal(parsed.location, "Hyderabad");
  assert.equal(parsed.eventDate, "2026-12-20");
  assert.equal(parsed.budgetMax, 50000);
  assert.equal(parsed.services[0].category, "Photography");
  assert.deepEqual(
    parsed.services[0].requirements.map((r) => r.toLowerCase()).sort(),
    ["candid photography", "traditional photography"]
  );
});

test("rule-based parser understands k and lakh amounts", () => {
  const p1 = ruleBasedParse("budget 50k", { categories: [], locations: [] });
  const p2 = ruleBasedParse("budget rs 1.5 lakh", { categories: [], locations: [] });
  assert.equal(p1.budgetMax, 50000);
  assert.equal(p2.budgetMax, 150000);
});
