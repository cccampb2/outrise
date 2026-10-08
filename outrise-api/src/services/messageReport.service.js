import mongoose from "mongoose";
import Message from "../models/Message.js";
import Conversation from "../models/Conversation.js";
import User from "../models/User.js";
import IssueReport from "../models/IssueReport.js";
import NotFoundError from "../errors/NotFoundError.js";
import BadRequestError from "../errors/BadRequestError.js";

export async function reportMessage({ userId, messageId, reason }) {
  if (
    typeof reason !== "string" ||
    reason.trim().length < 10 ||
    reason.trim().length > 3000
  ) {
    throw new BadRequestError(
      "Describe your concern in 10 to 3,000 characters",
    );
  }
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(async () => {
      const message = await Message.findById(messageId).session(session).lean();
      if (!message || message.removedAt || !message.sender)
        throw new NotFoundError("Message not available for reporting");
      const conversation = await Conversation.findOne({
        _id: message.conversation,
        $or: [{ userLow: userId }, { userHigh: userId }],
      })
        .session(session)
        .lean();
      if (!conversation)
        throw new NotFoundError("Message not available for reporting");
      if (String(message.sender) === String(userId))
        throw new BadRequestError(
          "You can only report messages from another user",
        );
      // Serialize against account deletion so no copied personal data is left behind.
      const users = await User.updateMany(
        {
          _id: { $in: [userId, message.sender] },
          deletionRequestedAt: null,
        },
        { $inc: { accountMutationRevision: 1 } },
        { session },
      );
      if (users.matchedCount !== 2)
        throw new NotFoundError("This account is no longer available");
      const reporter = await User.findById(userId)
        .select("email")
        .session(session)
        .lean();
      const [report] = await IssueReport.create(
        [
          {
            email: reporter.email,
            reporter: userId,
            reportedUser: message.sender,
            subject: "Report message",
            message: reason.trim(),
            reportedMessage: {
              messageId: message._id,
              conversation: message.conversation,
              text: message.text,
              sentAt: message.createdAt,
            },
          },
        ],
        { session },
      );
      return report;
    });
  } finally {
    await session.endSession();
  }
}
