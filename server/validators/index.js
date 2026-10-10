const { z } = require("zod");

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");
const trimmed = (max = 200) => z.string().trim().max(max);
const stringList = (maxItems = 30, maxLen = 120) =>
  z.array(z.string().trim().min(1).max(maxLen)).max(maxItems).default([]);
const money = z.coerce.number().min(0).max(100_000_000);
const dateField = z.coerce.date({ invalid_type_error: "Invalid date" });
const idParams = z.object({ id: objectId });

// ---- Auth -----------------------------------------------------------------
const register = z.object({
  name: trimmed(80).min(2, "Name must be at least 2 characters"),
  email: z.string().trim().toLowerCase().email("Please provide a valid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be at most 72 characters"),
  role: z.enum(["CUSTOMER", "PROVIDER"]).default("CUSTOMER"),
});

const login = z.object({
  email: z.string().trim().toLowerCase().email("Please provide a valid email"),
  password: z.string().min(1, "Password is required"),
});

// ---- Providers ------------------------------------------------------------
const providerProfileFields = {
  businessName: trimmed(100).min(2),
  categories: z.array(objectId).min(1, "Choose at least one category").max(10),
  description: trimmed(2000).default(""),
  location: trimmed(80).min(2),
  serviceAreas: stringList(20, 80),
  startingPrice: money.default(0),
  skills: stringList(30, 60),
  coverImage: z.string().trim().url("Cover image must be a URL").or(z.literal("")).default(""),
  portfolio: z.array(z.string().trim().url("Portfolio items must be URLs")).max(20).default([]),
  experienceYears: z.coerce.number().int().min(0).max(60).default(0),
  availability: z
    .object({
      workingDays: z.array(z.number().int().min(0).max(6)).max(7),
      blockedDates: z.array(dateField).max(366),
    })
    .partial()
    .optional(),
};
const providerProfileCreate = z.object(providerProfileFields);
const providerProfileUpdate = z.object(providerProfileFields).partial().strict();

const providerQuery = z.object({
  q: trimmed(80).optional(),
  category: trimmed(60).optional(), // slug
  location: trimmed(80).optional(),
  minPrice: money.optional(),
  maxPrice: money.optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  verified: z.enum(["true", "false"]).optional(),
  sort: z.enum(["rating", "price_asc", "price_desc", "newest"]).default("rating"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

// ---- Requests -------------------------------------------------------------
const serviceItem = z.object({
  category: objectId,
  requirements: stringList(15, 120),
});

const requestBase = {
  title: trimmed(120).min(3, "Title must be at least 3 characters"),
  eventType: trimmed(60).min(2),
  location: trimmed(80).min(2),
  eventDate: dateField,
  duration: z.coerce.number().min(0).max(240).default(0),
  guestCount: z.coerce.number().int().min(0).max(100000).default(0),
  budgetMin: money.default(0),
  budgetMax: money.default(0),
  services: z.array(serviceItem).min(1, "Add at least one service").max(10),
  description: trimmed(2000).default(""),
  mode: z.enum(["MANUAL", "AI"]).default("MANUAL"),
  invitedProviders: z.array(objectId).max(20).default([]),
};

const budgetRule = (d) => !d.budgetMax || (d.budgetMin ?? 0) <= d.budgetMax;
const budgetMessage = { message: "Minimum budget cannot exceed maximum budget", path: ["budgetMin"] };

const requestCreate = z.object(requestBase).refine(budgetRule, budgetMessage);
const requestUpdate = z
  .object(requestBase)
  .omit({ mode: true, invitedProviders: true })
  .partial()
  .strict()
  .refine(budgetRule, budgetMessage);

const requestInvite = z.object({ providerId: objectId });

const openRequestsQuery = z.object({
  matching: z.enum(["true", "false"]).default("false"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

// ---- Proposals / bookings / reviews ----------------------------------------
const proposalCreate = z.object({
  request: objectId,
  proposedPrice: z.coerce.number().min(1, "Price must be greater than 0").max(100_000_000),
  includedServices: stringList(20, 120),
  exclusions: stringList(20, 120),
  message: trimmed(1500).default(""),
});

const bookingStatus = z.object({
  status: z.enum(["IN_PROGRESS", "COMPLETED", "CANCELLED"]),
});

const reviewCreate = z.object({
  booking: objectId,
  rating: z.coerce.number().int().min(1).max(5),
  comment: trimmed(1000).default(""),
});

// ---- AI -------------------------------------------------------------------
const parseRequirement = z.object({
  text: trimmed(2000).min(10, "Please describe your event in a bit more detail"),
});
const requestRef = z.object({ requestId: objectId });

// ---- Admin ----------------------------------------------------------------
const categoryCreate = z.object({
  name: trimmed(60).min(2),
  description: trimmed(300).default(""),
});
const categoryUpdate = z
  .object({ name: trimmed(60).min(2), description: trimmed(300), active: z.boolean() })
  .partial()
  .strict();
const adminUserUpdate = z.object({ isActive: z.boolean() });
const adminVerify = z.object({ verified: z.boolean() });

module.exports = {
  idParams,
  register,
  login,
  providerProfileCreate,
  providerProfileUpdate,
  providerQuery,
  requestCreate,
  requestUpdate,
  requestInvite,
  openRequestsQuery,
  proposalCreate,
  bookingStatus,
  reviewCreate,
  parseRequirement,
  requestRef,
  categoryCreate,
  categoryUpdate,
  adminUserUpdate,
  adminVerify,
};
