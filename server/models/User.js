const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const ROLES = ["CUSTOMER", "PROVIDER", "ADMIN"];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
    },
    // Never returned by default; select explicitly with .select("+passwordHash").
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: "CUSTOMER", index: true },
    isActive: { type: Boolean, default: true },
    savedProviders: [{ type: mongoose.Schema.Types.ObjectId, ref: "ProviderProfile" }],
  },
  { timestamps: true }
);

userSchema.methods.verifyPassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.statics.hashPassword = (plain) => bcrypt.hash(plain, 12);

userSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("User", userSchema);
module.exports.ROLES = ROLES;
