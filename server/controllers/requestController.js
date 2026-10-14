const ServiceRequest = require("../models/ServiceRequest");
const ProviderProfile = require("../models/ProviderProfile");
const Category = require("../models/Category");
const Proposal = require("../models/Proposal");
const { notify } = require("../services/notificationService");
const ApiError = require("../utils/ApiError");
const { asyncHandler, assertObjectId, startOfToday, ok } = require("../utils/helpers");

const POPULATE = [
  { path: "services.category", select: "name slug" },
  { path: "customer", select: "name" },
];

async function assertCategories(services = []) {
  const ids = [...new Set(services.map((s) => String(s.category)))];
  const count = await Category.countDocuments({ _id: { $in: ids }, active: true });
  if (count !== ids.length) throw ApiError.badRequest("One or more selected services are invalid");
}

function assertFutureDate(date) {
  if (date < startOfToday()) throw ApiError.badRequest("Event date cannot be in the past");
}

/** Loads a request the caller owns, or throws 404 (never reveals other users' requests). */
async function loadOwned(id, user) {
  assertObjectId(id, "Request");
  const request = await ServiceRequest.findById(id);
  if (!request || (String(request.customer) !== String(user._id) && user.role !== "ADMIN")) {
    throw ApiError.notFound("Request not found");
  }
  return request;
}

exports.loadOwned = loadOwned;

exports.create = asyncHandler(async (req, res) => {
  assertFutureDate(req.body.eventDate);
  await assertCategories(req.body.services);

  const invited = req.body.invitedProviders;
  if (invited.length && (await ProviderProfile.countDocuments({ _id: { $in: invited } })) !== invited.length) {
    throw ApiError.badRequest("One or more invited providers do not exist");
  }

  const request = await ServiceRequest.create({ ...req.body, customer: req.user._id });
  const populated = await request.populate(POPULATE);

  // Broadcast to relevant providers via real-time WebSocket & in-app notification
  try {
    const categoryIds = (req.body.services || []).map((s) => s.category);
    const matchingProviders = await ProviderProfile.find({ categories: { $in: categoryIds } }).select("user");
    const serviceNames = (populated.services || []).map((s) => s.category?.name).filter(Boolean).join(", ");

    for (const p of matchingProviders) {
      if (String(p.user) !== String(req.user._id)) {
        await notify(p.user, {
          title: `New Requirement: ${populated.title}`,
          body: `A customer requested ${serviceNames || "services"} in ${populated.location || "your area"}. Tap to quote!`,
          link: "/provider/requests",
        });
      }
    }

    const realtime = require("../services/realtime");
    realtime.broadcast("new_request", {
      _id: populated._id,
      title: populated.title,
      location: populated.location,
      eventDate: populated.eventDate,
      categoryIds,
      serviceNames,
    });
  } catch (err) {
    console.warn("Realtime dispatch failed (non-critical):", err.message);
  }

  ok(res, populated, 201);
});

exports.mine = asyncHandler(async (req, res) => {
  const requests = await ServiceRequest.find({ customer: req.user._id }).populate(POPULATE).sort("-createdAt").lean();

  const counts = await Proposal.aggregate([
    { $match: { request: { $in: requests.map((r) => r._id) }, status: "PENDING" } },
    { $group: { _id: "$request", count: { $sum: 1 } } },
  ]);
  const byRequest = new Map(counts.map((c) => [String(c._id), c.count]));

  ok(res, requests.map((r) => ({ ...r, pendingProposals: byRequest.get(String(r._id)) || 0 })));
});

/** GET /requests/open — providers browse requirements they can quote on. */
exports.open = asyncHandler(async (req, res) => {
  const { matching, page, limit } = req.query;
  const profile = await ProviderProfile.findOne({ user: req.user._id }).lean();

  const filter = { status: "OPEN", eventDate: { $gte: startOfToday() } };
  if (matching === "true") {
    if (!profile) throw ApiError.badRequest("Create your provider profile to see matching requests");
    filter["services.category"] = { $in: profile.categories };
  }

  const [requests, total, mine] = await Promise.all([
    ServiceRequest.find(filter)
      .populate(POPULATE)
      .sort("eventDate")
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    ServiceRequest.countDocuments(filter),
    Proposal.find({ provider: req.user._id }).select("request status").lean(),
  ]);

  const proposedStatus = new Map(mine.map((p) => [String(p.request), p.status]));
  const items = requests.map((r) => ({
    ...r,
    invited: !!profile && (r.invitedProviders || []).some((id) => String(id) === String(profile._id)),
    myProposalStatus: proposedStatus.get(String(r._id)) || null,
  }));
  // Surface direct invitations first.
  items.sort((a, b) => Number(b.invited) - Number(a.invited));

  ok(res, items, 200, { pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

exports.getById = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id, "Request");
  const request = await ServiceRequest.findById(req.params.id).populate(POPULATE).lean();
  if (!request) throw ApiError.notFound("Request not found");

  const isOwner = String(request.customer._id) === String(req.user._id);
  const isAdmin = req.user.role === "ADMIN";
  let allowed = isOwner || isAdmin;

  // Providers may see open requests, or any request they have quoted on.
  if (!allowed && req.user.role === "PROVIDER") {
    allowed =
      request.status === "OPEN" || !!(await Proposal.exists({ request: request._id, provider: req.user._id }));
  }
  if (!allowed) throw ApiError.notFound("Request not found");

  ok(res, request);
});

exports.update = asyncHandler(async (req, res) => {
  const request = await loadOwned(req.params.id, req.user);
  if (request.status !== "OPEN") throw ApiError.conflict("Only open requests can be edited");

  if (req.body.eventDate) assertFutureDate(req.body.eventDate);
  if (req.body.services) await assertCategories(req.body.services);

  const merged = { ...request.toObject(), ...req.body };
  if (merged.budgetMax && merged.budgetMin > merged.budgetMax) {
    throw ApiError.badRequest("Minimum budget cannot exceed maximum budget");
  }

  request.set(req.body);
  await request.save();
  ok(res, await request.populate(POPULATE));
});

exports.cancel = asyncHandler(async (req, res) => {
  const request = await loadOwned(req.params.id, req.user);
  if (request.status !== "OPEN") {
    throw ApiError.conflict("Only open requests can be cancelled. Cancel the booking instead.");
  }
  request.status = "CANCELLED";
  await request.save();
  await Proposal.updateMany({ request: request._id, status: "PENDING" }, { status: "REJECTED" });
  ok(res, request);
});

exports.invite = asyncHandler(async (req, res) => {
  const request = await loadOwned(req.params.id, req.user);
  if (request.status !== "OPEN") throw ApiError.conflict("Only open requests can invite providers");

  const target = await ProviderProfile.findById(req.body.providerId).select("user businessName");
  if (!target) throw ApiError.notFound("Provider not found");

  const already = request.invitedProviders.some((p) => String(p) === String(target._id));
  await ServiceRequest.updateOne({ _id: request._id }, { $addToSet: { invitedProviders: req.body.providerId } });
  if (!already) {
    await notify(target.user, {
      type: "INVITE",
      title: "You were invited to quote",
      body: request.title + " · " + request.location,
      link: "/provider/requests",
    });
  }
  ok(res, { message: "Provider invited" });
});

/** PATCH /requests/:id/plan — customer's checklist and budget split. */
exports.updatePlan = asyncHandler(async (req, res) => {
  const request = await loadOwned(req.params.id, req.user);
  request.checklist = req.body.checklist;
  request.budgetPlan = req.body.budgetPlan;
  await request.save();
  ok(res, { checklist: request.checklist, budgetPlan: request.budgetPlan });
});
