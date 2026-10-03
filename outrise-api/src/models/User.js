import mongoose from "mongoose";
import { ACCOUNT_STATUSES } from "../constants/accountStatus.js";
import { USER_ROLES } from "../constants/userRoles.js";

const { Schema, model } = mongoose;

const passwordResetSchema = new Schema(
  {
    id: { type: String, required: true, match: /^[a-f0-9]{32}$/ },
    codeHash: { type: String, required: true, match: /^[a-f0-9]{64}$/ },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0, min: 0, max: 5 },
  },
  { _id: false },
);

const emailVerificationSchema = new Schema(
  {
    id: { type: String, required: true, match: /^[a-f0-9]{32}$/ },
    codeHash: { type: String, required: true, match: /^[a-f0-9]{64}$/ },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0, min: 0, max: 5 },
  },
  { _id: false },
);

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    // Existing documents without this flag also require email verification.
    emailVerified: { type: Boolean, default: false },
    emailVerification: { type: emailVerificationSchema, select: false },
    emailVerificationRequestedAt: { type: Date, select: false },
    // Hidden recovery state; never included in normal profile/account queries.
    passwordReset: { type: passwordResetSchema, select: false },
    passwordResetRequestedAt: { type: Date, select: false },
    tokenVersion: { type: Number, default: 0, min: 0, select: false },
    role: {
      type: String,
      enum: USER_ROLES,
      default: "user",
    },
    accountStatus: {
      type: String,
      enum: ACCOUNT_STATUSES,
      default: "active",
    },
    suspendedUntil: { type: Date, default: null },
    moderationReason: {
      type: String,
      trim: true,
      maxlength: 1000,
      select: false,
    },
    moderatedBy: { type: Schema.Types.ObjectId, ref: "User", select: false },
    moderatedAt: { type: Date, select: false },
    faction: {
      type: Schema.Types.ObjectId,
      ref: "Faction",
      default: null,
    },
    lifetimeXP: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalWorkouts: {
      type: Number,
      default: 0,
      min: 0,
    },
    firstName: {
      type: String,
      trim: true,
      default: "",
    },

    lastName: {
      type: String,
      trim: true,
      default: "",
    },

    nameVisibility: {
      type: String,
      enum: ["public", "friends", "private"],
      default: "private",
    },

    bio: {
      type: String,
      trim: true,
      default: "",
      maxlength: 250,
    },

    profileImage: {
      url: {
        type: String,
        default: null,
      },
      publicId: {
        type: String,
        default: null,
      },
    },
  },

  { timestamps: true },
);

userSchema.index({
  accountStatus: 1,
  lifetimeXP: -1,
  _id: 1,
});
userSchema.index({ accountStatus: 1, suspendedUntil: 1 });

const User = model("User", userSchema);

export default User;
