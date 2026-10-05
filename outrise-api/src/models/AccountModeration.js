import mongoose from "mongoose";
import { ACCOUNT_STATUSES } from "../constants/accountStatus.js";

const { Schema, model } = mongoose;

const accountModerationSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    admin: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    previousStatus: { type: String, enum: ACCOUNT_STATUSES, required: true },
    status: { type: String, enum: ACCOUNT_STATUSES, required: true },
    reason: { type: String, trim: true, maxlength: 1000, required: true },
    suspendedUntil: { type: Date, default: null },
  },
  { timestamps: true },
);
accountModerationSchema.index({ user: 1, createdAt: -1, _id: -1 });
const AccountModeration = model("AccountModeration", accountModerationSchema);

export default AccountModeration;
