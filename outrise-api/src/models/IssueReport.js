import mongoose from "mongoose";

export const ISSUE_REPORT_STATUSES = ["open", "in_review", "resolved"];
const { Schema, model } = mongoose;
const historySchema = new Schema({
  admin: { type: Schema.Types.ObjectId, ref: "User", default: null },
  previousStatus: { type: String, enum: ISSUE_REPORT_STATUSES, required: true },
  status: { type: String, enum: ISSUE_REPORT_STATUSES, required: true },
  note: { type: String, trim: true, maxlength: 2000, default: "" },
  createdAt: { type: Date, required: true, default: Date.now },
});
const replySchema = new Schema({
  admin: { type: Schema.Types.ObjectId, ref: "User", default: null },
  to: { type: String, required: true },
  recipientName: { type: String, required: true },
  subject: { type: String, required: true, maxlength: 120 },
  message: { type: String, required: true, maxlength: 2000 },
  from: { type: String, required: true },
  templateId: { type: String, required: true },
  idempotencyKey: { type: String, required: true },
  status: { type: String, enum: ["pending", "sent", "failed"], required: true },
  providerId: { type: String, default: null },
  error: { type: String, default: "" },
  sentAt: { type: Date, default: null },
  createdAt: { type: Date, required: true },
  lastAttemptAt: { type: Date, required: true },
  attemptId: { type: Schema.Types.ObjectId, required: true },
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
    reporter: { type: Schema.Types.ObjectId, ref: "User", default: null },
    reportedMessage: {
      type: new Schema(
        {
          messageId: {
            type: Schema.Types.ObjectId,
            ref: "Message",
            required: true,
          },
          conversation: {
            type: Schema.Types.ObjectId,
            ref: "Conversation",
            required: true,
          },
          text: { type: String, required: true, maxlength: 2000 },
          sentAt: { type: Date, required: true },
        },
        { _id: false },
      ),
      default: null,
    },
    reportedUser: { type: Schema.Types.ObjectId, ref: "User", default: null },
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
    replies: { type: [replySchema], default: [] },
  },
  { timestamps: true },
);

issueReportSchema.index({ status: 1, createdAt: -1, _id: -1 });
issueReportSchema.index({ email: 1, createdAt: -1 });
issueReportSchema.index({ status: 1, resolvedAt: 1, _id: 1 });
const IssueReport = model("IssueReport", issueReportSchema);

export default IssueReport;
