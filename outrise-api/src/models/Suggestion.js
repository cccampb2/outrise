import mongoose from "mongoose";

const { Schema, model } = mongoose;
export const SUGGESTION_STATUSES = ["new", "reviewing", "planned", "closed"];
const suggestionSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: {
      type: String,
      trim: true,
      minlength: 3,
      maxlength: 120,
      required: true,
    },
    message: {
      type: String,
      trim: true,
      minlength: 10,
      maxlength: 3000,
      required: true,
    },
    status: {
      type: String,
      enum: SUGGESTION_STATUSES,
      default: "new",
      required: true,
    },
    revision: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);
suggestionSchema.index({ status: 1, createdAt: -1, _id: -1 });
const Suggestion = model("Suggestion", suggestionSchema);

export default Suggestion;
