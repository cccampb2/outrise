import mongoose from "mongoose";

const { Schema, model } = mongoose;

const proofSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["video"],
      required: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    publicId: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    _id: false,
  },
);

const performanceSchema = new Schema(
  {
    reps: {
      type: Number,
      default: null,
    },
    weightLbs: {
      type: Number,
      default: null,
    },
    distanceMiles: {
      type: Number,
      default: null,
    },
    timeSeconds: {
      type: Number,
      default: null,
    },
  },
  {
    _id: false,
  },
);

const verificationSchema = new Schema(
  {
    idempotencyKey: { type: String, trim: true, select: false },
    submissionFingerprint: { type: String, select: false },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    exercise: {
      type: Schema.Types.ObjectId,
      ref: "Exercise",
      required: true,
    },
    measurementType: {
      type: String,
      enum: ["weight_reps", "reps", "time", "distance_time", "duration"],
      required: true,
    },
    performance: {
      type: performanceSchema,
      required: true,
    },
    proof: {
      type: proofSchema,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      required: true,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

verificationSchema.index(
  { user: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: "string" } } },
);

const Verification = model("Verification", verificationSchema);

export default Verification;
