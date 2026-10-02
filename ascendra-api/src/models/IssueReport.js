import mongoose from "mongoose";

export const ISSUE_REPORT_STATUSES = ["open", "in_review", "resolved"];
const { Schema } = mongoose;
const historySchema = new Schema({
  admin: { type: Schema.Types.ObjectId, ref: "User", required: true },
  previousStatus: { type: String, enum: ISSUE_REPORT_STATUSES, required: true },
  status: { type: String, enum: ISSUE_REPORT_STATUSES, required: true },
  note: { type: String, trim: true, maxlength: 2000, default: "" },
  createdAt: { type: Date, required: true, default: Date.now },
});
const issueReportSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 120,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 3000,
    },
    status: {
      type: String,
      enum: ISSUE_REPORT_STATUSES,
      required: true,
      default: "open",
    },
    reviewer: { type: Schema.Types.ObjectId, ref: "User", default: null },
    resolvedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    resolvedAt: { type: Date, default: null },
    revision: { type: Number, min: 0, default: 0 },
    history: { type: [historySchema], default: [] },
  },
  { timestamps: true },
);

issueReportSchema.index({ status: 1, createdAt: -1, _id: -1 });
issueReportSchema.index({ email: 1, createdAt: -1 });
export default mongoose.model("IssueReport", issueReportSchema);
