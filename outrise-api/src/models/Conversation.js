import mongoose from "mongoose";

const { Schema, model } = mongoose;

const conversationSchema = new Schema(
  {
    userLow: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userHigh: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    closedAt: { type: Date, default: null },
    lastMessageAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

conversationSchema.index(
  {
    userLow: 1,
    userHigh: 1,
  },
  {
    unique: true,
  },
);

conversationSchema.index({ userLow: 1, lastMessageAt: -1 });
conversationSchema.index({ userHigh: 1, lastMessageAt: -1 });

const Conversation = model("Conversation", conversationSchema);

export default Conversation;
