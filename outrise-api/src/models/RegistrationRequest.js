import mongoose from "mongoose";
const { Schema } = mongoose;

const registrationRequestSchema = new Schema(
  {
    requestId: { type: String, required: true, unique: true },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      select: false,
    },
    username: { type: String, required: true, trim: true, select: false },
    passwordHash: { type: String, required: true, select: false },
    ageEligibilityConfirmedAt: { type: Date, required: true },
    legalAcceptance: {
      acceptedAt: { type: Date, required: true },
      termsVersion: { type: String, required: true },
      privacyVersion: { type: String, required: true },
    },
    generation: { type: String, required: true, select: false },
    codeHash: { type: String, required: true, select: false },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
    requestedAt: { type: Date, required: true },
    state: {
      type: String,
      enum: ["queued", "sending", "sent", "completed"],
      default: "queued",
    },
    deliveryKind: {
      type: String,
      enum: ["verification", "existing", null],
      default: null,
    },
    deliveryExpiresInMinutes: { type: Number, default: null },
    leaseToken: { type: String, default: null, select: false },
    leaseUntil: { type: Date, default: null },
    nextAttemptAt: { type: Date, required: true },
    deliveryAttempts: { type: Number, default: 0 },
    completedUser: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      select: false,
    },
    completedTokenVersion: { type: Number, default: null, select: false },
    revision: { type: Number, default: 0 },
  },
  { timestamps: true },
);
// Expiry is enforced in the service; MongoDB TTL removal can happen later.
registrationRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
registrationRequestSchema.index({ state: 1, nextAttemptAt: 1 });
export default mongoose.model("RegistrationRequest", registrationRequestSchema);
