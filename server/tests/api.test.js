/**
 * End-to-end API test: runs the real Express app against an in-memory MongoDB
 * and walks the complete marketplace lifecycle plus the key security rules.
 */
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret-test-secret-test-secret";
process.env.MONGODB_URI = "mongodb://placeholder"; // replaced below
process.env.AI_PROVIDER = "none";

const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");

let mongod;
let app;
const state = {};

const api = () => request(app);
const auth = (token) => ({ Authorization: `Bearer ${token}` });

async function register(name, email, role) {
  const res = await api().post("/api/auth/register").send({ name, email, password: "Password123!", role });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return res.body.data;
}

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  app = require("../app");
  // Ensure unique/partial indexes exist before the first write.
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
});

after(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

test("health check", async () => {
  const res = await api().get("/api/health");
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
});

test("registration validates input, hashes passwords and rejects duplicates", async () => {
  const bad = await api().post("/api/auth/register").send({ name: "A", email: "nope", password: "short" });
  assert.equal(bad.status, 400);

  state.customer = await register("Cathy Customer", "cathy@test.com", "CUSTOMER");
  assert.equal(state.customer.user.passwordHash, undefined);

  const stored = await mongoose.model("User").findOne({ email: "cathy@test.com" }).select("+passwordHash");
  assert.notEqual(stored.passwordHash, "Password123!");
  assert.match(stored.passwordHash, /^\$2[aby]\$/);

  const dup = await api().post("/api/auth/register").send({ name: "Cathy", email: "cathy@test.com", password: "Password123!" });
  assert.equal(dup.status, 409);

  const adminAttempt = await api()
    .post("/api/auth/register")
    .send({ name: "Mallory", email: "mallory@test.com", password: "Password123!", role: "ADMIN" });
  assert.equal(adminAttempt.status, 400, "public registration must not allow ADMIN");
});

test("login works and failures are generic", async () => {
  const ok = await api().post("/api/auth/login").send({ email: "cathy@test.com", password: "Password123!" });
  assert.equal(ok.status, 200);
  assert.ok(ok.body.data.token);

  const wrongPw = await api().post("/api/auth/login").send({ email: "cathy@test.com", password: "wrong-password" });
  const noUser = await api().post("/api/auth/login").send({ email: "ghost@test.com", password: "wrong-password" });
  assert.equal(wrongPw.status, 401);
  assert.equal(wrongPw.body.message, noUser.body.message);
});

test("protected routes require authentication and the right role", async () => {
  assert.equal((await api().get("/api/requests/mine")).status, 401);
  state.provider = await register("Pat Provider", "pat@test.com", "PROVIDER");
  state.provider2 = await register("Quinn Provider", "quinn@test.com", "PROVIDER");
  const res = await api().get("/api/requests/mine").set(auth(state.provider.token));
  assert.equal(res.status, 403);
});

test("provider creates a profile; customers cannot", async () => {
  const Category = mongoose.model("Category");
  state.cat = await Category.create({ name: "Photography", slug: "photography" });

  const body = {
    businessName: "Pat Photos",
    categories: [String(state.cat._id)],
    location: "Hyderabad",
    serviceAreas: ["Hyderabad"],
    startingPrice: 30000,
    skills: ["Candid photography", "Traditional photography"],
    experienceYears: 5,
  };
  const forbidden = await api().post("/api/providers/profile").set(auth(state.customer.token)).send(body);
  assert.equal(forbidden.status, 403);

  const created = await api().post("/api/providers/profile").set(auth(state.provider.token)).send(body);
  assert.equal(created.status, 201);
  state.profile = created.body.data;

  const again = await api().post("/api/providers/profile").set(auth(state.provider.token)).send(body);
  assert.equal(again.status, 409);

  const second = await api()
    .post("/api/providers/profile")
    .set(auth(state.provider2.token))
    .send({ ...body, businessName: "Quinn Clicks", startingPrice: 45000 });
  assert.equal(second.status, 201);
  state.profile2 = second.body.data;
});

test("manual mode: directory search and filters", async () => {
  const all = await api().get("/api/providers?category=photography&location=hyderabad");
  assert.equal(all.body.data.length, 2);

  const cheap = await api().get("/api/providers?maxPrice=35000");
  assert.equal(cheap.body.data.length, 1);
  assert.equal(cheap.body.data[0].businessName, "Pat Photos");

  const none = await api().get("/api/providers?location=Mumbai");
  assert.equal(none.body.data.length, 0);
});

test("customer creates a requirement; validation rules apply", async () => {
  const future = new Date(Date.now() + 60 * 864e5);
  future.setUTCHours(0, 0, 0, 0);
  state.eventDate = future.toISOString().slice(0, 10);

  const base = {
    title: "Wedding photography",
    eventType: "Wedding",
    location: "Hyderabad",
    eventDate: state.eventDate,
    budgetMin: 0,
    budgetMax: 50000,
    services: [{ category: String(state.cat._id), requirements: ["Candid photography"] }],
  };

  const past = await api()
    .post("/api/requests")
    .set(auth(state.customer.token))
    .send({ ...base, eventDate: "2020-01-01" });
  assert.equal(past.status, 400);

  const badBudget = await api()
    .post("/api/requests")
    .set(auth(state.customer.token))
    .send({ ...base, budgetMin: 90000 });
  assert.equal(badBudget.status, 400);

  const res = await api().post("/api/requests").set(auth(state.customer.token)).send(base);
  assert.equal(res.status, 201);
  state.request = res.body.data;
});

test("customers cannot read other customers' requests", async () => {
  const other = await register("Olive Other", "olive@test.com", "CUSTOMER");
  const res = await api().get(`/api/requests/${state.request._id}`).set(auth(other.token));
  assert.equal(res.status, 404);
  const proposals = await api().get(`/api/requests/${state.request._id}/proposals`).set(auth(other.token));
  assert.equal(proposals.status, 404);
});

test("AI mode: parse text, then rank real providers with explanations", async () => {
  const parsed = await api()
    .post("/api/ai/parse-requirement")
    .set(auth(state.customer.token))
    .send({ text: "I need a wedding photographer in Hyderabad on 20 December 2026. Budget is 50k. Candid photography please." });
  assert.equal(parsed.status, 200);
  assert.equal(parsed.body.data.source, "rules");
  assert.equal(parsed.body.data.location, "Hyderabad");
  assert.equal(parsed.body.data.budgetMax, 50000);
  assert.equal(parsed.body.data.services[0].categoryName, "Photography");

  const rec = await api()
    .post("/api/ai/recommendations")
    .set(auth(state.customer.token))
    .send({ requestId: state.request._id });
  assert.equal(rec.status, 200);
  // budget 50k: Pat (30k) matches, Quinn (45k) also fits.
  assert.equal(rec.body.data.matches.length, 2);
  assert.ok(rec.body.data.matches[0].score >= rec.body.data.matches[1].score);
  assert.ok(rec.body.data.matches[0].explanation.length > 10);
});

test("proposal workflow: submit, duplicate guard, compare", async () => {
  const bad = await api().post("/api/proposals").set(auth(state.customer.token)).send({ request: state.request._id, proposedPrice: 100 });
  assert.equal(bad.status, 403);

  const first = await api()
    .post("/api/proposals")
    .set(auth(state.provider.token))
    .send({ request: state.request._id, proposedPrice: 38000, includedServices: ["8 hours", "Album"], message: "Hi" });
  assert.equal(first.status, 201);
  state.proposal = first.body.data;

  const dup = await api()
    .post("/api/proposals")
    .set(auth(state.provider.token))
    .send({ request: state.request._id, proposedPrice: 35000 });
  assert.equal(dup.status, 409);

  const second = await api()
    .post("/api/proposals")
    .set(auth(state.provider2.token))
    .send({ request: state.request._id, proposedPrice: 47000, includedServices: ["10 hours"] });
  state.proposal2 = second.body.data;

  const list = await api().get(`/api/requests/${state.request._id}/proposals`).set(auth(state.customer.token));
  assert.equal(list.body.data.length, 2);
  assert.equal(list.body.data[0].proposedPrice, 38000, "sorted cheapest first");

  const cmp = await api()
    .post("/api/ai/compare-proposals")
    .set(auth(state.customer.token))
    .send({ requestId: state.request._id });
  assert.equal(cmp.body.data.facts.cheapest, state.proposal._id);
});

test("only the owning customer can accept; a provider cannot accept their own proposal", async () => {
  const byProvider = await api().patch(`/api/proposals/${state.proposal._id}/accept`).set(auth(state.provider.token));
  assert.equal(byProvider.status, 403);

  const other = await register("Eve Other", "eve@test.com", "CUSTOMER");
  const byOther = await api().patch(`/api/proposals/${state.proposal._id}/accept`).set(auth(other.token));
  assert.equal(byOther.status, 404);
});

test("accepting is atomic: concurrent accepts create exactly one booking", async () => {
  const results = await Promise.all([
    api().patch(`/api/proposals/${state.proposal._id}/accept`).set(auth(state.customer.token)),
    api().patch(`/api/proposals/${state.proposal2._id}/accept`).set(auth(state.customer.token)),
  ]);
  const statuses = results.map((r) => r.status).sort();
  assert.deepEqual(statuses, [201, 409]);

  const bookings = await mongoose.model("Booking").find({ request: state.request._id });
  assert.equal(bookings.length, 1);
  state.booking = bookings[0];

  const req = await mongoose.model("ServiceRequest").findById(state.request._id);
  assert.equal(req.status, "BOOKED");

  const pending = await mongoose.model("Proposal").countDocuments({ request: state.request._id, status: "PENDING" });
  assert.equal(pending, 0);
});

test("booking lifecycle enforces who may do what and in which order", async () => {
  const id = state.booking._id;
  const winner = String(state.booking.provider) === state.provider.user._id ? state.provider : state.provider2;

  // customer cannot start work
  let r = await api().patch(`/api/bookings/${id}/status`).set(auth(state.customer.token)).send({ status: "IN_PROGRESS" });
  assert.equal(r.status, 403);

  // cannot jump straight to completed
  r = await api().patch(`/api/bookings/${id}/status`).set(auth(winner.token)).send({ status: "COMPLETED" });
  assert.equal(r.status, 409);

  // review not allowed before completion
  r = await api().post("/api/reviews").set(auth(state.customer.token)).send({ booking: String(id), rating: 5 });
  assert.equal(r.status, 409);

  r = await api().patch(`/api/bookings/${id}/status`).set(auth(winner.token)).send({ status: "IN_PROGRESS" });
  assert.equal(r.status, 200);
  r = await api().patch(`/api/bookings/${id}/status`).set(auth(winner.token)).send({ status: "COMPLETED" });
  assert.equal(r.status, 200);
  assert.ok(r.body.data.completedAt);

  // completed bookings are terminal
  r = await api().patch(`/api/bookings/${id}/status`).set(auth(state.customer.token)).send({ status: "CANCELLED" });
  assert.equal(r.status, 409);

  state.winner = winner;
});

test("reviews: only the booking's customer, once, and ratings update", async () => {
  const id = String(state.booking._id);

  const byProvider = await api().post("/api/reviews").set(auth(state.winner.token)).send({ booking: id, rating: 5 });
  assert.equal(byProvider.status, 403);

  const other = await register("Rex Other", "rex@test.com", "CUSTOMER");
  const byOther = await api().post("/api/reviews").set(auth(other.token)).send({ booking: id, rating: 1 });
  assert.equal(byOther.status, 404);

  const invalid = await api().post("/api/reviews").set(auth(state.customer.token)).send({ booking: id, rating: 9 });
  assert.equal(invalid.status, 400);

  const good = await api().post("/api/reviews").set(auth(state.customer.token)).send({ booking: id, rating: 4, comment: "Great" });
  assert.equal(good.status, 201);

  const again = await api().post("/api/reviews").set(auth(state.customer.token)).send({ booking: id, rating: 5 });
  assert.equal(again.status, 409);

  const profile = await api().get(`/api/providers/${state.booking.providerProfile}`);
  assert.equal(profile.body.data.ratingAverage, 4);
  assert.equal(profile.body.data.ratingCount, 1);
});

test("cancelling a booking re-opens the request", async () => {
  const future = new Date(Date.now() + 90 * 864e5).toISOString().slice(0, 10);
  const reqRes = await api()
    .post("/api/requests")
    .set(auth(state.customer.token))
    .send({
      title: "Second event", eventType: "Birthday", location: "Hyderabad", eventDate: future,
      services: [{ category: String(state.cat._id), requirements: [] }],
    });
  const requestId = reqRes.body.data._id;

  const prop = await api()
    .post("/api/proposals")
    .set(auth(state.provider.token))
    .send({ request: requestId, proposedPrice: 20000 });
  const accepted = await api().patch(`/api/proposals/${prop.body.data._id}/accept`).set(auth(state.customer.token));
  assert.equal(accepted.status, 201);

  const cancelled = await api()
    .patch(`/api/bookings/${accepted.body.data._id}/status`)
    .set(auth(state.customer.token))
    .send({ status: "CANCELLED" });
  assert.equal(cancelled.status, 200);

  const check = await api().get(`/api/requests/${requestId}`).set(auth(state.customer.token));
  assert.equal(check.body.data.status, "OPEN");
});

test("admin endpoints are restricted; admin can verify providers", async () => {
  const denied = await api().get("/api/admin/stats").set(auth(state.customer.token));
  assert.equal(denied.status, 403);

  const User = mongoose.model("User");
  const admin = await User.create({
    name: "Root", email: "root@test.com", role: "ADMIN", passwordHash: await User.hashPassword("Password123!"),
  });
  const login = await api().post("/api/auth/login").send({ email: "root@test.com", password: "Password123!" });
  const token = login.body.data.token;
  assert.ok(admin);

  const stats = await api().get("/api/admin/stats").set(auth(token));
  assert.equal(stats.status, 200);
  assert.ok(stats.body.data.users >= 5);

  const verify = await api()
    .patch(`/api/admin/providers/${state.profile._id}/verify`)
    .set(auth(token))
    .send({ verified: true });
  assert.equal(verify.body.data.verified, true);
});
