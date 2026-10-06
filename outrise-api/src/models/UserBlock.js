import mongoose from "mongoose";
const { Schema, model } = mongoose;
const userBlockSchema = new Schema(
  {
    blocker: { type: Schema.Types.ObjectId, ref: "User", required: true },
    blocked: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);
userBlockSchema.index({ blocker: 1, blocked: 1 }, { unique: true });
userBlockSchema.index({ blocked: 1, blocker: 1 });
export default model("UserBlock", userBlockSchema);
