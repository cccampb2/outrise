import mongoose from "mongoose";
import SystemMessage from "../models/SystemMessage.js";
import ActivityEvent from "../models/ActivityEvent.js";
import NotificationState from "../models/NotificationState.js";
import User from "../models/User.js";
import { canAccessAccount } from "../constants/accountStatus.js";
import BadRequestError from "../errors/BadRequestError.js";
import ForbiddenError from "../errors/ForbiddenError.js";
import NotFoundError from "../errors/NotFoundError.js";
import ConflictError from "../errors/ConflictError.js";
import { createActivityEvent } from "./activity.service.js";
import {
  getNotificationVisibility,
  updateNotificationState,
} from "./notification.service.js";

const getViewer = async (userId) => {
  const user = await User.findById(userId)
    .select("role accountStatus createdAt")
    .lean();
  if (!user || !canAccessAccount(user.accountStatus)) {
    throw new NotFoundError("User not found");
  }
  return user;
};

const publicMessage = (message, eventId, read = false) => ({
  _id: message._id,
  title: message.title,
  text: message.text,
  createdAt: message.createdAt,
  eventId,
  read,
});

const getExistingPublication = async ({
  userId,
  title,
  text,
  idempotencyKey,
}) => {
  const message = await SystemMessage.findOne({
    createdBy: userId,
    idempotencyKey,
  });
  if (!message) return null;
  if (message.title !== title || message.text !== text) {
    throw new ConflictError(
      "This announcement key has already been used for different content",
    );
  }
  const event = await ActivityEvent.findOne({
    type: "system_announcement",
    sourceId: message._id,
  }).select("_id");
  if (!event) throw new NotFoundError("Announcement notification not found");
  return { systemMessage: publicMessage(message, event._id), created: false };
};

export const publishSystemMessage = async ({
  userId,
  title,
  text,
  idempotencyKey,
}) => {
  const owner = await getViewer(userId);
  if (owner.role !== "owner") {
    throw new ForbiddenError("Only the owner can publish announcements");
  }
  if (typeof title !== "string" || !title.trim() || title.trim().length > 120) {
    throw new BadRequestError(
      "Enter an announcement title of 1–120 characters",
    );
  }
  if (typeof text !== "string" || !text.trim() || text.trim().length > 4000) {
    throw new BadRequestError("Enter an announcement of 1–4,000 characters");
  }
  if (
    typeof idempotencyKey !== "string" ||
    !idempotencyKey.trim() ||
    idempotencyKey.length > 100
  ) {
    throw new BadRequestError("Provide a valid announcement key");
  }
  const input = {
    userId,
    title: title.trim(),
    text: text.trim(),
    idempotencyKey,
  };
  const existing = await getExistingPublication(input);
  if (existing) return existing;

  const mongoSession = await mongoose.startSession();
  try {
    const result = await mongoSession.withTransaction(async () => {
      const [message] = await SystemMessage.create(
        [
          {
            title: input.title,
            text: input.text,
            createdBy: userId,
            idempotencyKey,
          },
        ],
        { session: mongoSession },
      );
      const event = await createActivityEvent(
        {
          type: "system_announcement",
          audience: "global",
          sourceType: "system_message",
          sourceId: message._id,
          details: { announcementTitle: message.title },
          occurredAt: message.createdAt,
          idempotencyKey: `system_announcement:${message._id}`,
        },
        { mongoSession },
      );
      return {
        systemMessage: publicMessage(message, event._id),
        created: true,
      };
    });
    return result;
  } catch (error) {
    if (error.code === 11000) {
      const existing = await getExistingPublication(input);
      if (existing) return existing;
    }
    throw error;
  } finally {
    await mongoSession.endSession();
  }
};

export const getUnreadSystemMessageCount = async (userId) => {
  const visibility = await getNotificationVisibility(userId);
  const acknowledged = await NotificationState.find({
    user: userId,
    $or: [{ readAt: { $ne: null } }, { dismissedAt: { $ne: null } }],
  }).distinct("event");
  const unreadCount = await ActivityEvent.countDocuments({
    ...visibility,
    type: "system_announcement",
    audience: "global",
    _id: { $nin: acknowledged },
  });
  return { unreadCount };
};

export const getSystemMessages = async ({
  userId,
  page = 1,
  limit = 20,
  ownerHistory = false,
}) => {
  const user = await getViewer(userId);
  if (ownerHistory && user.role !== "owner") {
    throw new ForbiddenError("Only the owner can view publication history");
  }
  const filter = ownerHistory ? {} : { createdAt: { $gte: user.createdAt } };
  const [messages, total, { unreadCount }] = await Promise.all([
    SystemMessage.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select("title text createdAt")
      .lean(),
    SystemMessage.countDocuments(filter),
    getUnreadSystemMessageCount(userId),
  ]);
  const events = await ActivityEvent.find({
    type: "system_announcement",
    audience: "global",
    sourceId: { $in: messages.map((message) => message._id) },
  })
    .select("_id sourceId")
    .lean();
  const states = await NotificationState.find({
    user: userId,
    event: { $in: events.map((event) => event._id) },
  })
    .select("event readAt dismissedAt")
    .lean();
  const eventByMessage = new Map(
    events.map((event) => [String(event.sourceId), event._id]),
  );
  const stateByEvent = new Map(
    states.map((state) => [String(state.event), state]),
  );
  return {
    messages: messages.map((message) => {
      const eventId = eventByMessage.get(String(message._id));
      const state = stateByEvent.get(String(eventId));
      return publicMessage(
        message,
        eventId ?? null,
        Boolean(state?.readAt || state?.dismissedAt),
      );
    }),
    unreadCount,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const getSystemMessage = async ({ userId, messageId }) => {
  const user = await getViewer(userId);
  const message = await SystemMessage.findOne({
    _id: messageId,
    createdAt: { $gte: user.createdAt },
  })
    .select("title text createdAt")
    .lean();
  if (!message) throw new NotFoundError("Announcement not found");
  const event = await ActivityEvent.findOne({
    type: "system_announcement",
    audience: "global",
    sourceId: message._id,
  })
    .select("_id")
    .lean();
  if (!event) throw new NotFoundError("Announcement notification not found");
  const state = await NotificationState.findOne({
    user: userId,
    event: event._id,
  }).lean();
  return publicMessage(
    message,
    event._id,
    Boolean(state?.readAt || state?.dismissedAt),
  );
};

export const getSystemMessageSummary = async (userId) => {
  const result = await getSystemMessages({ userId, page: 1, limit: 1 });
  return {
    latest: result.messages[0] ?? null,
    unreadCount: result.unreadCount,
  };
};

export const markSystemMessagesRead = async ({ userId, eventIds }) => {
  await updateNotificationState({
    userId,
    eventIds,
    type: "system_announcement",
  });
};
