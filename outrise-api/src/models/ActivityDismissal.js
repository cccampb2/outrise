import mongoose from "mongoose";

const { Schema, model } = mongoose;
const activityDismissalSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  event: { type: Schema.Types.ObjectId, ref: "ActivityEvent", required: true },
  dismissedAt: { type: Date, required: true, default: Date.now },
});
activityDismissalSchema.index({ user: 1, event: 1 }, { unique: true });
const ActivityDismissal = model("ActivityDismissal", activityDismissalSchema);

export default ActivityDismissal;
