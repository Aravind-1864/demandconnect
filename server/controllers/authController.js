const jwt = require("jsonwebtoken");
const env = require("../config/env");
const User = require("../models/User");
const ProviderProfile = require("../models/ProviderProfile");
const ApiError = require("../utils/ApiError");
const { asyncHandler, ok } = require("../utils/helpers");

const signToken = (user) =>
  jwt.sign({ sub: user._id.toString(), role: user.role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });

exports.register = asyncHandler(async (req, res) => {
  const { name, email, password, role, businessName, categories, location } = req.body;

  if (await User.exists({ email })) throw ApiError.conflict("An account with this email already exists");

  const user = await User.create({ name, email, role, passwordHash: await User.hashPassword(password) });

  if (role === "PROVIDER") {
    await ProviderProfile.create({
      user: user._id,
      businessName: businessName?.trim() || `${name}'s Services`,
      categories: Array.isArray(categories) && categories.length ? categories : [],
      location: location?.trim() || "Hyderabad",
    });
  }

  ok(res, { user, token: signToken(user) }, 201);
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select("+passwordHash");

  // Same message for unknown email and wrong password to avoid account enumeration.
  if (!user || !(await user.verifyPassword(password))) {
    throw ApiError.unauthorized("Invalid email or password");
  }
  if (!user.isActive) throw ApiError.forbidden("This account has been disabled");

  ok(res, { user, token: signToken(user) });
});

exports.me = asyncHandler(async (req, res) => {
  const profile =
    req.user.role === "PROVIDER" ? await ProviderProfile.findOne({ user: req.user._id }).select("_id") : null;
  ok(res, { user: req.user, hasProfile: !!profile });
});

// Tokens are stateless; the client discards its token. Endpoint exists so the
// client has one place to hook server-side session revocation later.
exports.logout = (_req, res) => ok(res, { message: "Logged out" });
