import mongoose from "mongoose";
import { USER_ROLES } from "../constants/userRoles.js";

const { Schema, model } = mongoose;

const userRoleChangeSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    previousRole: { type: String, enum: USER_ROLES, required: true },
    role: { type: String, enum: ["user", "admin"], required: true },
    reason: { type: String, trim: true, maxlength: 1000, required: true },
  },
  { timestamps: true },
);

userRoleChangeSchema.index({ user: 1, createdAt: -1, _id: -1 });
const UserRoleChange = model("UserRoleChange", userRoleChangeSchema);

export default UserRoleChange;
