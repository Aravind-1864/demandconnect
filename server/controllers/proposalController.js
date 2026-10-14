const Proposal = require("../models/Proposal");
const ServiceRequest = require("../models/ServiceRequest");
const ProviderProfile = require("../models/ProviderProfile");
const Booking = require("../models/Booking");
const { notify } = require("../services/notificationService");
const { ACTIVE_BOOKING_STATUSES } = require("../models/Booking");
const ApiError = require("../utils/ApiError");
const { asyncHandler, assertObjectId, dayRange, startOfToday, ok } = require("../utils/helpers");
const { checkAvailability } = require("../services/matchingService");
const { loadOwned } = require("./requestController");

const PROFILE_FIELDS = "businessName ratingAverage ratingCount verified location startingPrice";

/** Provider submits (or re-submits after withdrawing) a proposal. */
exports.create = asyncHandler(async (req, res) => {
  const { request: requestId, proposedPrice, includedServices, exclusions, message } = req.body;

  const profile = await ProviderProfile.findOne({ user: req.user._id });
  if (!profile) throw ApiError.badRequest("Create your provider profile before sending proposals");

  const request = await ServiceRequest.findById(requestId);
  if (!request || request.status !== "OPEN") throw ApiError.conflict("This request is no longer open");
  if (request.eventDate < startOfToday()) throw ApiError.conflict("The event date has already passed");

  const existing = await Proposal.findOne({ request: requestId, provider: req.user._id });
  if (existing && existing.status !== "WITHDRAWN") {
    throw ApiError.conflict("You have already submitted a proposal for this request");
  }

  const fields = { proposedPrice, includedServices, exclusions, message, status: "PENDING" };
  const proposal = existing
    ? await Object.assign(existing, fields).save()
    : await Proposal.create({ ...fields, request: requestId, provider: req.user._id, providerProfile: profile._id });

  await notify(request.customer, {
    type: "PROPOSAL",
    title: "New proposal from " + profile.businessName,
    body: "₹" + Number(proposedPrice).toLocaleString("en-IN") + " for " + request.title,
    link: "/customer/requests/" + request._id + "/proposals",
  });

  ok(res, proposal, existing ? 200 : 201);
});

/** Customer: proposals for one of their requests. */
exports.listForRequest = asyncHandler(async (req, res) => {
  const request = await loadOwned(req.params.id, req.user);
  const proposals = await Proposal.find({ request: request._id, status: { $ne: "WITHDRAWN" } })
    .populate("providerProfile", PROFILE_FIELDS)
    .sort("proposedPrice")
    .lean();
  ok(res, proposals);
});

/** Provider: their own proposals. */
exports.mine = asyncHandler(async (req, res) => {
  const proposals = await Proposal.find({ provider: req.user._id })
    .populate({ path: "request", select: "title eventType location eventDate status budgetMin budgetMax" })
    .sort("-createdAt")
    .lean();
  ok(res, proposals);
});

/**
 * Accept a proposal. Written as a sequence of atomic, conditional updates so it
 * is safe without multi-document transactions (works on standalone MongoDB too):
 *
 *   1. claim the proposal   PENDING → ACCEPTED
 *   2. claim the request    OPEN    → BOOKED       (only one racer wins)
 *   3. create the booking   (partial unique index is the last line of defence)
 *   4. reject competitors
 *
 * Any failure after a claim rolls the claims back.
 */
exports.accept = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id, "Proposal");
  const proposal = await Proposal.findById(req.params.id);
  if (!proposal) throw ApiError.notFound("Proposal not found");

  const request = await loadOwned(proposal.request, req.user); // 404 unless caller owns the request
  if (String(request.customer) !== String(req.user._id)) throw ApiError.forbidden();
  if (request.status !== "OPEN") throw ApiError.conflict("This request is no longer open");
  if (proposal.status !== "PENDING") throw ApiError.conflict(`Proposal is already ${proposal.status.toLowerCase()}`);

  // Final availability check against the provider's *current* calendar.
  const profile = await ProviderProfile.findById(proposal.providerProfile).lean();
  const { start, end } = dayRange(request.eventDate);
  const clash = await Booking.exists({
    provider: proposal.provider,
    eventDate: { $gte: start, $lt: end },
    status: { $in: ACTIVE_BOOKING_STATUSES.filter((s) => s !== "COMPLETED") },
  });
  const availability = checkAvailability(profile, request.eventDate, new Set(clash ? [start.toISOString().slice(0, 10)] : []));
  if (!availability.available) {
    throw ApiError.conflict(`Provider is no longer available: ${availability.reason}`);
  }

  const claimedProposal = await Proposal.findOneAndUpdate(
    { _id: proposal._id, status: "PENDING" },
    { status: "ACCEPTED" },
    { returnDocument: "after" }
  );
  if (!claimedProposal) throw ApiError.conflict("Proposal was just updated. Please refresh.");

  const claimedRequest = await ServiceRequest.findOneAndUpdate(
    { _id: request._id, status: "OPEN" },
    { status: "BOOKED" },
    { returnDocument: "after" }
  );
  if (!claimedRequest) {
    await Proposal.updateOne({ _id: proposal._id }, { status: "PENDING" });
    throw ApiError.conflict("This request was just booked. Please refresh.");
  }

  let booking;
  try {
    booking = await Booking.create({
      request: request._id,
      proposal: proposal._id,
      customer: request.customer,
      provider: proposal.provider,
      providerProfile: proposal.providerProfile,
      agreedPrice: proposal.proposedPrice, // price is fixed at acceptance; never editable later
      eventDate: request.eventDate,
    });
  } catch (err) {
    await Promise.all([
      Proposal.updateOne({ _id: proposal._id }, { status: "PENDING" }),
      ServiceRequest.updateOne({ _id: request._id }, { status: "OPEN" }),
    ]);
    throw err;
  }

  await Proposal.updateMany(
    { request: request._id, _id: { $ne: proposal._id }, status: "PENDING" },
    { status: "REJECTED" }
  );

  await notify(proposal.provider, {
    type: "PROPOSAL_ACCEPTED",
    title: "Your proposal was accepted!",
    body: request.title + " · ₹" + proposal.proposedPrice.toLocaleString("en-IN"),
    link: "/provider/bookings",
  });

  ok(res, booking, 201);
});

exports.reject = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id, "Proposal");
  const proposal = await Proposal.findById(req.params.id);
  if (!proposal) throw ApiError.notFound("Proposal not found");
  await loadOwned(proposal.request, req.user);

  const updated = await Proposal.findOneAndUpdate(
    { _id: proposal._id, status: "PENDING" },
    { status: "REJECTED" },
    { returnDocument: "after" }
  );
  if (!updated) throw ApiError.conflict("Only pending proposals can be rejected");
  await notify(updated.provider, {
    type: "PROPOSAL_REJECTED",
    title: "A proposal was declined",
    body: "The customer chose not to proceed with your offer.",
    link: "/provider/proposals",
  });
  ok(res, updated);
});

exports.withdraw = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id, "Proposal");
  const updated = await Proposal.findOneAndUpdate(
    { _id: req.params.id, provider: req.user._id, status: "PENDING" },
    { status: "WITHDRAWN" },
    { returnDocument: "after" }
  );
  if (!updated) throw ApiError.conflict("Only your pending proposals can be withdrawn");
  ok(res, updated);
});
