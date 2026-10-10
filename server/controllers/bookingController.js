const Booking = require("../models/Booking");
const ServiceRequest = require("../models/ServiceRequest");
const Proposal = require("../models/Proposal");
const Review = require("../models/Review");
const ApiError = require("../utils/ApiError");
const { asyncHandler, assertObjectId, ok } = require("../utils/helpers");

const POPULATE = [
  { path: "request", select: "title eventType location eventDate services description" },
  { path: "providerProfile", select: "businessName location ratingAverage ratingCount" },
  { path: "customer", select: "name" },
];

// status → statuses it may move to. Terminal states have no outgoing edges.
const TRANSITIONS = {
  CONFIRMED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

/** Who may trigger which target status. */
const ACTOR_RULES = {
  IN_PROGRESS: ["PROVIDER"],
  COMPLETED: ["PROVIDER"],
  CANCELLED: ["CUSTOMER", "PROVIDER"],
};

async function loadParticipantBooking(id, user) {
  assertObjectId(id, "Booking");
  const booking = await Booking.findById(id);
  const isParty =
    booking && [String(booking.customer), String(booking.provider)].includes(String(user._id));
  if (!booking || (!isParty && user.role !== "ADMIN")) throw ApiError.notFound("Booking not found");
  return booking;
}

exports.mine = asyncHandler(async (req, res) => {
  const field = req.user.role === "PROVIDER" ? "provider" : "customer";
  const bookings = await Booking.find({ [field]: req.user._id }).populate(POPULATE).sort("-createdAt").lean();

  const reviewed = new Set(
    (await Review.find({ booking: { $in: bookings.map((b) => b._id) } }).select("booking").lean()).map((r) =>
      String(r.booking)
    )
  );
  ok(res, bookings.map((b) => ({ ...b, reviewed: reviewed.has(String(b._id)) })));
});

exports.getById = asyncHandler(async (req, res) => {
  const booking = await loadParticipantBooking(req.params.id, req.user);
  await booking.populate(POPULATE);
  const review = await Review.findOne({ booking: booking._id }).lean();
  ok(res, { ...booking.toObject(), review });
});

exports.updateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const booking = await loadParticipantBooking(req.params.id, req.user);

  if (!ACTOR_RULES[status].includes(req.user.role)) {
    throw ApiError.forbidden(`Only a ${ACTOR_RULES[status].join(" or ").toLowerCase()} can set a booking to ${status}`);
  }
  if (!TRANSITIONS[booking.status].includes(status)) {
    throw ApiError.conflict(`A ${booking.status.toLowerCase().replace("_", " ")} booking cannot become ${status}`);
  }

  const update = { status };
  if (status === "COMPLETED") update.completedAt = new Date();
  if (status === "CANCELLED") Object.assign(update, { cancelledAt: new Date(), cancelledBy: req.user._id });

  // Conditional on the current status so concurrent changes can't skip a state.
  const updated = await Booking.findOneAndUpdate({ _id: booking._id, status: booking.status }, update, { returnDocument: "after" });
  if (!updated) throw ApiError.conflict("Booking was just updated. Please refresh.");

  if (status === "COMPLETED") {
    await ServiceRequest.updateOne({ _id: booking.request }, { status: "COMPLETED" });
  }
  if (status === "CANCELLED") {
    // Re-open the requirement so the customer can pick another proposal.
    await ServiceRequest.updateOne({ _id: booking.request, status: "BOOKED" }, { status: "OPEN" });
    await Proposal.updateOne({ _id: booking.proposal }, { status: "WITHDRAWN" });
  }

  ok(res, updated);
});
