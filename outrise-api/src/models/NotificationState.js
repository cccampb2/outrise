import mongoose from "mongoose";

const { Schema, model } = mongoose;

const notificationStateSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    event: {
      type: Schema.Types.ObjectId,
      ref: "ActivityEvent",
      required: true,
    },
    readAt: { type: Date, default: null },
    dismissedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
notificationStateSchema.index({ user: 1, event: 1 }, { unique: true });
const NotificationState = model("NotificationState", notificationStateSchema);

export default NotificationState;
