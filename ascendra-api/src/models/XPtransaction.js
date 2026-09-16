import mongoose from "mongoose";

const { Schema, model } = mongoose;

const xpTransactionSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      validate: {
        validator: Number.isInteger,
        message: "XP amount must be a whole number",
      },
    },
    sourceType: {
      type: String,
      enum: [
        "workout_completion",
        "personal_record",
        "echelon",
        "zenith",
        "challenge",
        "workout_of_the_week",
        "admin_adjustment",
      ],
      required: true,
    },
    sourceId: {
      type: Schema.Types.ObjectId,
      default: null,
    },
    reason: {
      type: String,
      trim: true,
      required: true,
    },
    idempotencyKey: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

xpTransactionSchema.index({ user: 1, createdAt: -1 });

xpTransactionSchema.index(
  { idempotencyKey: 1 },
  {
    unique: true,
  },
);

const XPTransaction = model("XPTransaction", xpTransactionSchema);

export default XPTransaction;
