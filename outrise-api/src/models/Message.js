import mongoose from "mongoose";

const { Schema, model } = mongoose;

const messageSchema = new Schema(
  {
    conversation: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    removedAt: { type: Date, default: null },
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: function () {
        return !this.removedAt;
      },
    },
    readBy: { type: [Schema.Types.ObjectId], ref: "User", default: [] },
    text: {
      type: String,
      required: true,
      trim: true,
      maxLength: 2000,
    },
    idempotencyKey: {
      type: String,
      required: true,
      maxLength: 100,
    },
  },
  {
    timestamps: true,
  },
);

messageSchema.index(
  {
    sender: 1,
    idempotencyKey: 1,
  },
  {
    unique: true,
  },
);

messageSchema.index({
  conversation: 1,
  createdAt: -1,
  _id: -1,
});

const Message = model("Message", messageSchema);

export default Message;
