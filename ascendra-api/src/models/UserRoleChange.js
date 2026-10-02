import mongoose from "mongoose";
import { USER_ROLES } from "../constants/userRoles.js";

const userRoleChangeSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    previousRole: { type: String, enum: USER_ROLES, required: true },
    role: { type: String, enum: ["user", "admin"], required: true },
    reason: { type: String, trim: true, maxlength: 1000, required: true },
  },
  { timestamps: true },
);

userRoleChangeSchema.index({ user: 1, createdAt: -1, _id: -1 });
export default mongoose.model("UserRoleChange", userRoleChangeSchema);
