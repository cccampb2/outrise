import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ActivityEvent",
      required: true,
    },
    readAt: { type: Date, default: null },
    dismissedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
schema.index({ user: 1, event: 1 }, { unique: true });
export default mongoose.model("NotificationState", schema);
