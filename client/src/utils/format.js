export const formatINR = (n) =>
  n || n === 0 ? `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 })}` : "—";

export const formatDate = (d, opts = { day: "numeric", month: "short", year: "numeric" }) =>
  d ? new Date(d).toLocaleDateString("en-IN", { ...opts, timeZone: "UTC" }) : "—";

/** 'YYYY-MM-DD' for <input type="date"> from any date value. */
export const toInputDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");

export const todayInput = () => new Date().toISOString().slice(0, 10);

export const budgetLabel = (min, max) => {
  if (!max) return "Flexible";
  return min ? `${formatINR(min)} – ${formatINR(max)}` : `Up to ${formatINR(max)}`;
};

const humanize = (s) => s.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
export const statusLabel = humanize;

export const STATUS_TONE = {
  OPEN: "blue",
  PENDING: "amber",
  ACCEPTED: "green",
  REJECTED: "red",
  WITHDRAWN: "slate",
  BOOKED: "violet",
  CONFIRMED: "blue",
  IN_PROGRESS: "amber",
  COMPLETED: "green",
  CANCELLED: "red",
};
