import mongoose from "mongoose";
const { Schema, model } = mongoose;
const schema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, required: true, unique: true },
    assets: [
      {
        _id: false,
        publicId: { type: String, required: true },
        resourceType: {
          type: String,
          enum: ["image", "video"],
          required: true,
        },
      },
    ],
    attempts: { type: Number, default: 0 },
    nextAttemptAt: { type: Date, default: Date.now },
    leaseUntil: { type: Date, default: null },
    leaseToken: { type: String, default: null },
  },
  { timestamps: true },
);
schema.index({ nextAttemptAt: 1, leaseUntil: 1 });
export default model("AccountDeletion", schema);
