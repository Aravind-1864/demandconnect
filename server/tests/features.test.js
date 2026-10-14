/** Tests for the second wave of features: favorites, notifications, chat, uploads, stats, packages, planner, verification. */
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret-test-secret-test-secret";
process.env.MONGODB_URI = "mongodb://placeholder";
process.env.AI_PROVIDER = "none";

const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const mongoose = require("mongoose");
const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");

let mongod;
let app;
const s = {};
const api = () => request(app);
const auth = (t) => ({ Authorization: `Bearer ${t}` });

async function register(name, email, role) {
  const res = await api().post("/api/auth/register").send({ name, email, password: "Password123!", role });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return res.body.data;
}

const futureDate = (days) => new Date(Date.now() + days * 864e5).toISOString().slice(0, 10);

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  app = require("../app");
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));

  const Category = mongoose.model("Category");
  s.photo = await Category.create({ name: "Photography", slug: "photography" });
  s.cater = await Category.create({ name: "Catering", slug: "catering" });

  s.cust = await register("Cara Customer", "cara@test.com", "CUSTOMER");
  s.p1 = await register("Pat Photo", "pat@test.com", "PROVIDER");
  s.p2 = await register("Cy Caterer", "cy@test.com", "PROVIDER");
  s.admin = await mongoose.model("User").create({
    name: "Root", email: "root@test.com", role: "ADMIN",
    passwordHash: await mongoose.model("User").hashPassword("Password123!"),
  });
  const login = await api().post("/api/auth/login").send({ email: "root@test.com", password: "Password123!" });
  s.admin.token = login.body.data.token;

  const mk = (token, body) => api().post("/api/providers/profile").set(auth(token)).send(body);
  s.prof1 = (await mk(s.p1.token, {
    businessName: "Pat Photos", categories: [String(s.photo._id)], location: "Hyderabad",
    serviceAreas: ["Hyderabad"], startingPrice: 30000, skills: ["Candid photography"], experienceYears: 5,
  })).body.data;
  s.prof2 = (await mk(s.p2.token, {
    businessName: "Cy Catering", categories: [String(s.cater._id)], location: "Hyderabad",
    serviceAreas: ["Hyderabad"], startingPrice: 15000, skills: ["Buffet"], experienceYears: 8,
  })).body.data;
});

after(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

test("favorites: customers can save, list and remove providers; providers cannot", async () => {
  assert.equal((await api().post(`/api/favorites/${s.prof1._id}`).set(auth(s.p1.token))).status, 403);

  assert.equal((await api().post(`/api/favorites/${s.prof1._id}`).set(auth(s.cust.token))).status, 200);
  await api().post(`/api/favorites/${s.prof1._id}`).set(auth(s.cust.token)); // idempotent

  const ids = await api().get("/api/favorites/ids").set(auth(s.cust.token));
  assert.deepEqual(ids.body.data, [s.prof1._id]);

  const list = await api().get("/api/favorites").set(auth(s.cust.token));
  assert.equal(list.body.data.length, 1);
  assert.equal(list.body.data[0].businessName, "Pat Photos");

  await api().delete(`/api/favorites/${s.prof1._id}`).set(auth(s.cust.token));
  const after = await api().get("/api/favorites/ids").set(auth(s.cust.token));
  assert.deepEqual(after.body.data, []);
});

test("batch endpoint returns public profiles and hides moderation data", async () => {
  const res = await api().get(`/api/providers/batch?ids=${s.prof1._id},${s.prof2._id}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.data.length, 2);
  assert.equal(res.body.data[0].verification, undefined);
  assert.equal((await api().get("/api/providers/batch?ids=nope")).status, 400);
});

test("request → proposal notifies the customer; read state works", async () => {
  const req = await api().post("/api/requests").set(auth(s.cust.token)).send({
    title: "Wedding", eventType: "Wedding", location: "Hyderabad", eventDate: futureDate(45),
    budgetMax: 80000,
    services: [
      { category: String(s.photo._id), requirements: ["Candid photography"] },
      { category: String(s.cater._id), requirements: ["Buffet"] },
    ],
  });
  assert.equal(req.status, 201);
  s.request = req.body.data;

  const invite = await api().post(`/api/requests/${s.request._id}/invite`).set(auth(s.cust.token)).send({ providerId: s.prof1._id });
  assert.equal(invite.status, 200);
  const providerNotes = await api().get("/api/notifications").set(auth(s.p1.token));
  assert.equal(providerNotes.body.data[0].type, "INVITE");

  const prop = await api().post("/api/proposals").set(auth(s.p1.token))
    .send({ request: s.request._id, proposedPrice: 35000, includedServices: ["8 hours"] });
  assert.equal(prop.status, 201);
  s.proposal = prop.body.data;

  const notes = await api().get("/api/notifications").set(auth(s.cust.token));
  assert.equal(notes.body.unread, 1);
  assert.equal(notes.body.data[0].type, "PROPOSAL");

  const read = await api().patch(`/api/notifications/${notes.body.data[0]._id}/read`).set(auth(s.cust.token));
  assert.equal(read.body.data.read, true);

  // other users cannot touch it
  const other = await api().patch(`/api/notifications/${notes.body.data[0]._id}/read`).set(auth(s.p1.token));
  assert.equal(other.status, 404);

  await api().patch("/api/notifications/read-all").set(auth(s.cust.token));
  const again = await api().get("/api/notifications").set(auth(s.cust.token));
  assert.equal(again.body.unread, 0);
});

test("chat: customer ↔ provider only, unread counts and read receipts", async () => {
  const send = await api().post("/api/messages").set(auth(s.cust.token)).send({ recipient: s.p1.user._id, text: "Hi, are you free?" });
  assert.equal(send.status, 201);

  // customer → customer is not allowed
  const c2 = await register("Dan Customer", "dan@test.com", "CUSTOMER");
  const bad = await api().post("/api/messages").set(auth(s.cust.token)).send({ recipient: c2.user._id, text: "hello" });
  assert.equal(bad.status, 403);

  const unread = await api().get("/api/messages/unread-count").set(auth(s.p1.token));
  assert.equal(unread.body.data.count, 1);

  const convos = await api().get("/api/messages/conversations").set(auth(s.p1.token));
  assert.equal(convos.body.data.length, 1);
  assert.equal(convos.body.data[0].user.name, "Cara Customer");
  assert.equal(convos.body.data[0].unread, 1);

  const thread = await api().get(`/api/messages/with/${s.cust.user._id}`).set(auth(s.p1.token));
  assert.equal(thread.body.data.messages.length, 1);

  const afterRead = await api().get("/api/messages/unread-count").set(auth(s.p1.token));
  assert.equal(afterRead.body.data.count, 0);

  await api().post("/api/messages").set(auth(s.p1.token)).send({ recipient: s.cust.user._id, text: "Yes, that date works." });
  const full = await api().get(`/api/messages/with/${s.p1.user._id}`).set(auth(s.cust.token));
  assert.equal(full.body.data.messages.length, 2);
  assert.equal(full.body.data.user.businessName, "Pat Photos");
});

test("availability search: booked and blocked dates hide a provider", async () => {
  const date = futureDate(45);
  const free = await api().get(`/api/providers?date=${date}&category=photography`);
  assert.equal(free.body.data.length, 1);

  await api().patch("/api/providers/profile").set(auth(s.p1.token))
    .send({ availability: { blockedDates: [date] } });
  const blocked = await api().get(`/api/providers?date=${date}&category=photography`);
  assert.equal(blocked.body.data.length, 0);

  await api().patch("/api/providers/profile").set(auth(s.p1.token)).send({ availability: { blockedDates: [] } });
  assert.equal((await api().get("/api/providers?date=bad")).status, 400);
});

test("AI packages assemble per-service bundles within the budget", async () => {
  const res = await api().post("/api/ai/packages").set(auth(s.cust.token)).send({ requestId: s.request._id });
  assert.equal(res.status, 200);
  const pkgs = res.body.data.packages;
  assert.ok(pkgs.length >= 1);
  const best = pkgs[0];
  assert.equal(best.items.length, 2);
  assert.equal(best.total, 45000); // 30,000 photographer + 15,000 caterer
  assert.equal(best.withinBudget, true);

  const other = await register("Eve Customer", "eve@test.com", "CUSTOMER");
  assert.equal((await api().post("/api/ai/packages").set(auth(other.token)).send({ requestId: s.request._id })).status, 404);
});

test("planner: owner can save checklist and budget split", async () => {
  const body = {
    checklist: [{ text: "Book venue", done: true }, { text: "Send invites", done: false }],
    budgetPlan: [{ label: "Photography", amount: 35000 }, { label: "Catering", amount: 40000 }],
  };
  const res = await api().patch(`/api/requests/${s.request._id}/plan`).set(auth(s.cust.token)).send(body);
  assert.equal(res.status, 200);
  assert.equal(res.body.data.checklist.length, 2);

  const read = await api().get(`/api/requests/${s.request._id}`).set(auth(s.cust.token));
  assert.equal(read.body.data.budgetPlan[0].amount, 35000);

  const denied = await api().patch(`/api/requests/${s.request._id}/plan`).set(auth(s.p1.token)).send(body);
  assert.equal(denied.status, 403);
});

test("upload accepts images only and returns a servable URL", async () => {
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64"
  );
  const ok = await api().post("/api/uploads").set(auth(s.cust.token)).attach("file", png, { filename: "a.png", contentType: "image/png" });
  assert.equal(ok.status, 201);
  assert.match(ok.body.data.url, /\/uploads\/[a-f0-9]{32}\.png$/);

  const served = await api().get(new URL(ok.body.data.url).pathname);
  assert.equal(served.status, 200);

  const bad = await api().post("/api/uploads").set(auth(s.cust.token))
    .attach("file", Buffer.from("<script>"), { filename: "x.html", contentType: "text/html" });
  assert.equal(bad.status, 400);

  assert.equal((await api().post("/api/uploads").attach("file", png, { filename: "a.png", contentType: "image/png" })).status, 401);

  // clean up uploaded test files
  const dir = path.join(__dirname, "..", "uploads");
  for (const f of fs.readdirSync(dir)) if (f !== ".gitkeep") fs.unlinkSync(path.join(dir, f));
});

test("full job → review with photo → provider reply → stats", async () => {
  const accepted = await api().patch(`/api/proposals/${s.proposal._id}/accept`).set(auth(s.cust.token));
  assert.equal(accepted.status, 201);
  const bookingId = accepted.body.data._id;

  const accNotes = await api().get("/api/notifications").set(auth(s.p1.token));
  assert.ok(accNotes.body.data.some((n) => n.type === "PROPOSAL_ACCEPTED"));

  await api().patch(`/api/bookings/${bookingId}/status`).set(auth(s.p1.token)).send({ status: "IN_PROGRESS" });
  const done = await api().patch(`/api/bookings/${bookingId}/status`).set(auth(s.p1.token)).send({ status: "COMPLETED" });
  assert.equal(done.status, 200);
  const custNotes = await api().get("/api/notifications").set(auth(s.cust.token));
  assert.ok(custNotes.body.data.some((n) => n.type === "BOOKING"));

  const review = await api().post("/api/reviews").set(auth(s.cust.token)).send({
    booking: bookingId, rating: 5, comment: "Superb", photos: ["https://example.com/p.jpg"],
  });
  assert.equal(review.status, 201);
  assert.deepEqual(review.body.data.photos, ["https://example.com/p.jpg"]);

  // only the reviewed provider can reply, once
  const wrong = await api().patch(`/api/reviews/${review.body.data._id}/reply`).set(auth(s.p2.token)).send({ text: "hi" });
  assert.equal(wrong.status, 404);
  const reply = await api().patch(`/api/reviews/${review.body.data._id}/reply`).set(auth(s.p1.token)).send({ text: "Thank you!" });
  assert.equal(reply.status, 200);
  const twice = await api().patch(`/api/reviews/${review.body.data._id}/reply`).set(auth(s.p1.token)).send({ text: "again" });
  assert.equal(twice.status, 409);

  const list = await api().get(`/api/providers/${s.prof1._id}/reviews`);
  assert.equal(list.body.data[0].reply.text, "Thank you!");

  const mine = await api().get("/api/bookings/mine").set(auth(s.p1.token));
  assert.equal(mine.body.data[0].review.reply.text, "Thank you!");

  const stats = await api().get("/api/providers/me/stats").set(auth(s.p1.token));
  assert.equal(stats.status, 200);
  assert.equal(stats.body.data.totalEarned, 35000);
  assert.equal(stats.body.data.months.length, 6);
  assert.equal(stats.body.data.months[5].total, 35000);
  assert.equal(stats.body.data.acceptanceRate, 100);
  assert.ok(stats.body.data.avgResponseHours !== null);

  const detail = await api().get(`/api/providers/${s.prof1._id}`);
  assert.ok(detail.body.data.avgResponseHours !== null);

  const cal = await api().get("/api/providers/me/calendar").set(auth(s.p1.token));
  assert.equal(cal.body.data.bookings.length, 1);
});

test("proposal templates persist on the profile and stay private", async () => {
  const res = await api().patch("/api/providers/profile").set(auth(s.p1.token)).send({
    proposalTemplates: [{ name: "Standard", includedServices: ["8 hours", "Album"], exclusions: ["Travel"], message: "Hello" }],
  });
  assert.equal(res.status, 200);
  const mine = await api().get("/api/providers/me").set(auth(s.p1.token));
  assert.equal(mine.body.data.proposalTemplates[0].name, "Standard");
  const pub = await api().get(`/api/providers/${s.prof1._id}`);
  assert.equal(pub.body.data.proposalTemplates, undefined);
});

test("verification flow: submit → admin notified → approve → provider notified", async () => {
  const bad = await api().post("/api/providers/verification").set(auth(s.p2.token)).send({ documentUrl: "not a url" });
  assert.equal(bad.status, 400);

  const submit = await api().post("/api/providers/verification").set(auth(s.p2.token)).send({ documentUrl: "https://example.com/doc.pdf" });
  assert.equal(submit.status, 200);
  assert.equal(submit.body.data.status, "PENDING");

  const adminNotes = await api().get("/api/notifications").set(auth(s.admin.token));
  assert.equal(adminNotes.body.data[0].type, "VERIFICATION");

  const approve = await api().patch(`/api/admin/providers/${s.prof2._id}/verify`).set(auth(s.admin.token)).send({ verified: true });
  assert.equal(approve.body.data.verified, true);
  assert.equal(approve.body.data.verification.status, "APPROVED");

  const provNotes = await api().get("/api/notifications").set(auth(s.p2.token));
  assert.match(provNotes.body.data[0].title, /verified/i);

  const again = await api().post("/api/providers/verification").set(auth(s.p2.token)).send({ documentUrl: "https://example.com/doc.pdf" });
  assert.equal(again.status, 409);
});

test("admin analytics returns chart-ready series", async () => {
  const res = await api().get("/api/admin/analytics").set(auth(s.admin.token));
  assert.equal(res.status, 200);
  assert.equal(res.body.data.requestsByDay.length, 14);
  assert.ok(res.body.data.byCategory.length >= 1);
  assert.equal(res.body.data.topProviders[0].businessName, "Pat Photos");
  assert.equal((await api().get("/api/admin/analytics").set(auth(s.cust.token))).status, 403);
});
