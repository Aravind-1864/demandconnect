const User = require("../models/User");
const ProviderProfile = require("../models/ProviderProfile");
const ApiError = require("../utils/ApiError");
const { asyncHandler, assertObjectId, ok } = require("../utils/helpers");

exports.list = asyncHandler(async (req, res) => {
  const profiles = await ProviderProfile.find({ _id: { $in: req.user.savedProviders } })
    .populate([
      { path: "categories", select: "name slug image" },
      { path: "user", select: "name" },
    ])
    .lean();
  ok(res, profiles);
});

exports.ids = asyncHandler(async (req, res) => ok(res, req.user.savedProviders.map(String)));

exports.add = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id, "Provider");
  if (!(await ProviderProfile.exists({ _id: req.params.id }))) throw ApiError.notFound("Provider not found");
  await User.updateOne({ _id: req.user._id }, { $addToSet: { savedProviders: req.params.id } });
  ok(res, { saved: true });
});

exports.remove = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id, "Provider");
  await User.updateOne({ _id: req.user._id }, { $pull: { savedProviders: req.params.id } });
  ok(res, { saved: false });
});
