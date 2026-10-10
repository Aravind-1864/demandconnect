const mongoose = require("mongoose");
const ApiError = require("./ApiError");

/** Wraps an async route handler so rejected promises reach the error middleware. */
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/** Throws a 404 for malformed ids instead of letting Mongoose raise a CastError. */
function assertObjectId(id, label = "Resource") {
  if (!mongoose.isValidObjectId(id)) throw ApiError.notFound(`${label} not found`);
}

/** Escapes user input before it is used inside a RegExp. */
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** 'YYYY-MM-DD' (UTC) — the unit availability is evaluated in. */
const dayKey = (d) => new Date(d).toISOString().slice(0, 10);

/** Start of today in UTC. */
function startOfToday() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/** Start and end (exclusive) of the UTC day containing `d`. */
function dayRange(d) {
  const start = new Date(d);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

const ok = (res, data, status = 200, extra = {}) =>
  res.status(status).json({ success: true, data, ...extra });

module.exports = { asyncHandler, assertObjectId, escapeRegex, dayKey, startOfToday, dayRange, ok };
