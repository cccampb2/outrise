import User from "../models/User.js";
import ActivityEvent from "../models/ActivityEvent.js";
import NotificationState from "../models/NotificationState.js";
import { createActivityEvent } from "./activity.service.js";
import Conversation from "../models/Conversation.js";
import BadRequestError from "../errors/BadRequestError.js";
import ForbiddenError from "../errors/ForbiddenError.js";
import NotFoundError from "../errors/NotFoundError.js";
import { getFriendshipRelationship } from "./friend.service.js";
import Message from "../models/Message.js";
import ConflictError from "../errors/ConflictError.js";
import mongoose from "mongoose";

export const getOrCreateConversation = async ({ userId, otherUserId }) => {
  const firstId = userId.toString();
  const secondId = otherUserId.toString();

  if (firstId === secondId) {
    throw new BadRequestError("You cannot start a conversation with yourself");
  }

  const relationship = await getFriendshipRelationship({
    userId,
    otherUserId,
  });

  if (relationship.status !== "friends") {
    throw new ForbiddenError("You can only message accepted friends");
  }

  const pair =
    firstId < secondId
      ? { userLow: userId, userHigh: otherUserId }
      : { userLow: otherUserId, userHigh: userId };

  try {
    const conversation = await Conversation.findOneAndUpdate(
      pair,
      {
        $setOnInsert: pair,
      },
      {
        upsert: true,
        returnDocument: "after",
        runValidators: true,
      },
    );

    return conversation;
  } catch (error) {
    if (error.code === 11000) {
      const conversation = await Conversation.findOne(pair);
      if (conversation) {
        return conversation;
      }
    }
    throw error;
  }
};

const getConversationForUser = async ({ userId, conversationId }) => {
  const conversation = await Conversation.findOne({
    _id: conversationId,
    $or: [{ userLow: userId }, { userHigh: userId }],
  });

  if (!conversation) {
    throw new NotFoundError("Conversation not found");
  }

  return conversation;
};

const ensureConversationFriends = async ({ userId, conversation }) => {
  const otherUserId =
    conversation.userLow.toString() === userId.toString()
      ? conversation.userHigh
      : conversation.userLow;

  const relationship = await getFriendshipRelationship({
    userId,
    otherUserId,
  });

  if (relationship.status !== "friends") {
    throw new ForbiddenError("You can only message accepted friends");
  }
};

const getExistingMessage = async ({
  userId,
  conversationId,
  text,
  idempotencyKey,
}) => {
  const message = await Message.findOne({
    sender: userId,
    idempotencyKey,
  });

  if (!message) {
    return null;
  }

  if (
    message.conversation.toString() !== conversationId.toString() ||
    message.text !== text
  ) {
    throw new ConflictError(
      "This message key has already been used for a different message",
    );
  }

  return message;
};

export const sendMessage = async ({
  userId,
  conversationId,
  text,
  idempotencyKey,
}) => {
  if (typeof text !== "string" || !text.trim()) {
    throw new BadRequestError("Enter a message");
  }

  const trimmedText = text.trim();

  if (trimmedText.length > 2000) {
    throw new BadRequestError("Messages cannot exceed 2,000 characters");
  }

  if (
    typeof idempotencyKey !== "string" ||
    !idempotencyKey.trim() ||
    idempotencyKey.length > 100
  ) {
    throw new BadRequestError("Provide a valid message key");
  }

  const conversation = await getConversationForUser({ userId, conversationId });

  const messageInput = {
    userId,
    conversationId,
    text: trimmedText,
    idempotencyKey,
  };

  const existingMessage = await getExistingMessage(messageInput);

  if (existingMessage) {
    return existingMessage;
  }

  await ensureConversationFriends({
    userId,
    conversation,
  });

  const mongoSession = await mongoose.startSession();

  try {
    const message = await mongoSession.withTransaction(async () => {
      const [createdMessage] = await Message.create(
        [
          {
            conversation: conversationId,
            sender: userId,
            text: trimmedText,
            idempotencyKey,
          },
        ],
        {
          session: mongoSession,
        },
      );

      await Conversation.updateOne(
        {
          _id: conversationId,
        },
        {
          $max: {
            lastMessageAt: createdMessage.createdAt,
          },
        },
        {
          session: mongoSession,
        },
      );

      const sender = await User.findById(userId).select("username").session(mongoSession);
      if (!sender) throw new NotFoundError("Sender not found");
      const recipient = conversation.userLow.toString() === userId.toString() ? conversation.userHigh : conversation.userLow;
      await createActivityEvent({
        type: "message_received", audience: "personal", actor: userId, recipient,
        sourceType: "message", sourceId: createdMessage._id,
        details: { actorUsername: sender.username, conversationId },
        occurredAt: createdMessage.createdAt,
        idempotencyKey: `message_received:${createdMessage._id}`,
      }, { mongoSession });
      return createdMessage;
    });

    return message;
  } catch (error) {
    if (error.code === 11000) {
      const existingMessage = await getExistingMessage(messageInput);

      if (existingMessage) {
        return existingMessage;
      }
    }

    throw error;
  } finally {
    await mongoSession.endSession();
  }
};

export const getConversationMessages = async ({
  userId,
  conversationId,
  page = 1,
  limit = 30,
}) => {
  await getConversationForUser({ userId, conversationId });
  const skip = (page - 1) * limit;
  const messages = await Message.find({ conversation: conversationId })
    .sort({
      createdAt: -1,
      _id: -1,
    })
    .skip(skip)
    .limit(limit + 1)
    .lean();

  return {
    messages: messages.slice(0, limit),
    pagination: {
      page,
      limit,
      hasMore: messages.length > limit,
    },
  };
};

export const getConversations = async ({ userId, page = 1, limit = 20 }) => {
  const skip = (page - 1) * limit;
  const conversations = await Conversation.find({
    $or: [{ userLow: userId }, { userHigh: userId }],
  })
    .sort({ lastMessageAt: -1, _id: -1 })
    .skip(skip)
    .limit(limit + 1)
    .populate("userLow userHigh", "username profileImage")
    .lean();

  return {
    conversations: await addUnreadCounts(conversations.slice(0, limit), userId),
    pagination: {
      page,
      limit,
      hasMore: conversations.length > limit,
    },
  };
};

const unreadFilter = (userId, conversationIds) => ({
  conversation: { $in: conversationIds },
  sender: { $ne: new mongoose.Types.ObjectId(userId.toString()) },
  readBy: { $ne: new mongoose.Types.ObjectId(userId.toString()) },
});
async function addUnreadCounts(conversations, userId) {
  if (!conversations.length) return [];
  const counts = await Message.aggregate([
    { $match: unreadFilter(userId, conversations.map((conversation) => conversation._id)) },
    { $group: { _id: "$conversation", unreadCount: { $sum: 1 } } },
  ]);
  const byId = new Map(counts.map((count) => [count._id.toString(), count.unreadCount]));
  return conversations.map((conversation) => ({ ...conversation, unreadCount: byId.get(conversation._id.toString()) ?? 0 }));
}
export async function getUnreadMessageCount(userId) {
  const conversationIds = await Conversation.find({ $or: [{ userLow: userId }, { userHigh: userId }] }).distinct("_id");
  const unreadCount = await Message.countDocuments(unreadFilter(userId, conversationIds));
  return { unreadCount };
}
export async function markConversationRead({ userId, conversationId, throughMessageId }) {
  await getConversationForUser({ userId, conversationId });
  const throughMessage = await Message.findOne({ _id: throughMessageId, conversation: conversationId }).select("createdAt").lean();
  if (!throughMessage) throw new NotFoundError("Message not found in this conversation");
  // Acknowledge only the history actually fetched. A later arrival remains unread.
  const cutoff = [
    { createdAt: { $lt: throughMessage.createdAt } },
    { createdAt: throughMessage.createdAt, _id: { $lte: throughMessage._id } },
  ];
  await Message.updateMany({ conversation: conversationId, sender: { $ne: userId }, $or: cutoff }, { $addToSet: { readBy: userId } });
  const events = await ActivityEvent.find({
    type: "message_received", recipient: userId, "details.conversationId": conversationId,
    $or: [
      { occurredAt: { $lt: throughMessage.createdAt } },
      { occurredAt: throughMessage.createdAt, sourceId: { $lte: throughMessage._id } },
    ],
  }).select("_id").lean();
  const readAt = new Date();
  for (let offset = 0; offset < events.length; offset += 500) {
    await NotificationState.bulkWrite(events.slice(offset, offset + 500).map((event) => ({ updateOne: {
      filter: { user: userId, event: event._id },
      update: { $set: { readAt }, $setOnInsert: { user: userId, event: event._id } }, upsert: true,
    } })));
  }
}
