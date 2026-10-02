import mongoose from "mongoose";

const { Schema, model } = mongoose;

const friendshipSchema = new Schema(
  {
    requester: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    recipient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

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

    status: {
      type: String,
      enum: ["pending", "accepted"],
      default: "pending",
    },

    acceptedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

friendshipSchema.index(
  {
    userLow: 1,
    userHigh: 1,
  },
  {
    unique: true,
  },
);

friendshipSchema.index({
  recipient: 1,
  status: 1,
  createdAt: -1,
});

friendshipSchema.index({
  requester: 1,
  status: 1,
  createdAt: -1,
});

const Friendship = model("Friendship", friendshipSchema);

export default Friendship;
