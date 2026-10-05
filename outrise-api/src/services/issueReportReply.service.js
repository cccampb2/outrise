import mongoose from "mongoose";
import IssueReport from "../models/IssueReport.js";
import User from "../models/User.js";
import BadRequestError from "../errors/BadRequestError.js";
import ConflictError from "../errors/ConflictError.js";
import NotFoundError from "../errors/NotFoundError.js";
import {
  getSupportEmailConfig,
  sendSupportEmail,
  supportEmailVariables,
} from "./email.service.js";

const RETRY_WINDOW_MS = 23 * 60 * 60 * 1000;
const SEND_LEASE_MS = 45000;

async function getReport(reportId) {
  const report = await IssueReport.findById(reportId)
    .populate("reviewer resolvedBy history.admin replies.admin", "username")
    .lean();
  if (!report) {
    throw new NotFoundError("Issue report not found");
  }
  return report;
}

async function deliverReply(reportId, reply) {
  let providerId;
  try {
    providerId = await sendSupportEmail(reply);
  } catch (error) {
    await IssueReport.updateOne(
      {
        _id: reportId,
        replies: {
          $elemMatch: {
            _id: reply._id,
            attemptId: reply.attemptId,
            status: "pending",
          },
        },
      },
      {
        $set: {
          "replies.$.status": "failed",
          "replies.$.error": error.message,
        },
        $inc: { revision: 1 },
      },
      { runValidators: true },
    );
    throw error;
  }
  // Keep provider acceptance separate from persistence failures. A retry after
  // a database failure reuses the same payload and provider idempotency key.
  await IssueReport.updateOne(
    {
      _id: reportId,
      replies: {
        $elemMatch: {
          _id: reply._id,
          attemptId: reply.attemptId,
          status: "pending",
        },
      },
    },
    {
      $set: {
        "replies.$.status": "sent",
        "replies.$.providerId": providerId,
        "replies.$.sentAt": new Date(),
        "replies.$.error": "",
      },
      $inc: { revision: 1 },
    },
    { runValidators: true },
  );
  return getReport(reportId);
}

export const retryIssueReportReply = async ({ reportId, replyId }) => {
  const report = await getReport(reportId);
  const reply = report.replies?.find(
    (item) => String(item._id) === String(replyId),
  );
  if (!reply) {
    throw new NotFoundError("Email reply not found");
  }
  if (reply.status === "sent") {
    return report;
  }
  const now = new Date();
  if (now - new Date(reply.createdAt) >= RETRY_WINDOW_MS) {
    throw new ConflictError(
      "This reply's safe retry window has expired. Check its status in Resend before composing a new reply.",
    );
  }
  getSupportEmailConfig();
  const attemptId = new mongoose.Types.ObjectId();
  const claimed = await IssueReport.updateOne(
    {
      _id: reportId,
      replies: {
        $elemMatch: {
          _id: replyId,
          $or: [
            { status: "failed" },
            {
              status: "pending",
              lastAttemptAt: { $lte: new Date(now - SEND_LEASE_MS) },
            },
          ],
        },
      },
    },
    {
      $set: {
        "replies.$.status": "pending",
        "replies.$.lastAttemptAt": now,
        "replies.$.attemptId": attemptId,
        "replies.$.error": "",
      },
      $inc: { revision: 1 },
    },
    { runValidators: true },
  );
  if (!claimed.modifiedCount) {
    throw new ConflictError(
      "This reply is already being sent or was updated. Refresh the report in a moment.",
    );
  }
  return deliverReply(reportId, { ...reply, attemptId });
};

export const sendIssueReportReply = async ({
  reportId,
  adminId,
  subject,
  message,
  expectedRevision,
}) => {
  if (
    typeof subject !== "string" ||
    !subject.trim() ||
    subject.trim().length > 120 ||
    /[\r\n]/.test(subject) ||
    typeof message !== "string" ||
    !message.trim() ||
    message.trim().length > 2000 ||
    !Number.isInteger(expectedRevision) ||
    expectedRevision < 0
  ) {
    throw new BadRequestError(
      "Provide an email subject of up to 120 characters, a reply of up to 2,000 characters, and the current report revision.",
    );
  }
  subject = subject.trim();
  message = message.trim();
  const report = await getReport(reportId);
  const idempotencyKey = `support/${reportId}/${adminId}/${expectedRevision}`;
  const existing = report.replies?.find(
    (reply) => reply.idempotencyKey === idempotencyKey,
  );
  if (existing) {
    if (existing.subject !== subject || existing.message !== message) {
      throw new ConflictError(
        "This email request already belongs to a different reply. Refresh the report before composing another.",
      );
    }
    return retryIssueReportReply({ reportId, replyId: existing._id });
  }
  if (report.revision !== expectedRevision) {
    throw new ConflictError(
      "Another administrator updated this report. Refresh it before sending your reply.",
    );
  }
  const config = getSupportEmailConfig();
  const account = await User.findOne({ email: report.email })
    .select("firstName username")
    .lean();
  const now = new Date();
  const reply = {
    _id: new mongoose.Types.ObjectId(),
    admin: adminId,
    to: report.email,
    recipientName: account?.firstName || account?.username || "there",
    subject,
    message,
    ...config,
    idempotencyKey,
    status: "pending",
    createdAt: now,
    lastAttemptAt: now,
    attemptId: new mongoose.Types.ObjectId(),
  };
  supportEmailVariables(reply);
  const claimed = await IssueReport.updateOne(
    { _id: reportId, revision: expectedRevision },
    { $push: { replies: reply }, $inc: { revision: 1 } },
    { runValidators: true },
  );
  if (!claimed.modifiedCount) {
    throw new ConflictError(
      "Another administrator updated this report. Refresh it before sending your reply.",
    );
  }
  return deliverReply(reportId, reply);
};
