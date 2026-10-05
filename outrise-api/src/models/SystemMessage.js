import mongoose from "mongoose";

const { Schema, model } = mongoose;

const systemMessageSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxLength: 120 },
    text: { type: String, required: true, trim: true, maxLength: 4000 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    idempotencyKey: { type: String, required: true, maxLength: 100 },
  },
  { timestamps: true },
);

systemMessageSchema.index(
  { createdBy: 1, idempotencyKey: 1 },
  { unique: true },
);
systemMessageSchema.index({ createdAt: -1, _id: -1 });

const SystemMessage = model("SystemMessage", systemMessageSchema);

export default SystemMessage;
