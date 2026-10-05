import { canAccessAccount } from "../constants/accountStatus.js";
import ActivityEvent from "../models/ActivityEvent.js";
import NotificationState from "../models/NotificationState.js";
import User from "../models/User.js";
import NotFoundError from "../errors/NotFoundError.js";

export const NOTIFICATION_TYPES = [
  "system_announcement",
  "message_received",
  "friend_request_received",
  "friend_request_accepted",
  "verification_approved",
  "verification_rejected",
  "wotw_launched",
  "faction_season_won",
];

export const getNotificationVisibility = async (userId) => {
  const user = await User.findById(userId)
    .select("faction accountStatus createdAt")
    .lean();
  if (!user || !canAccessAccount(user.accountStatus)) {
    throw new NotFoundError("User not found");
  }
  const audiences = [
    { audience: "personal", recipient: userId },
    { audience: "global", occurredAt: { $gte: user.createdAt } },
  ];
  if (user.faction) {
    audiences.push({
      audience: "faction",
      faction: user.faction,
      occurredAt: { $gte: user.createdAt },
    });
  }
  return { type: { $in: NOTIFICATION_TYPES }, $or: audiences };
};

async function getNotificationFilters(userId) {
  const visibility = await getNotificationVisibility(userId);
  const states = await NotificationState.find({ user: userId })
    .select("event readAt dismissedAt")
    .lean();
  const dismissed = states
    .filter((state) => state.dismissedAt)
    .map((state) => state.event);
  const read = states
    .filter((state) => state.readAt)
    .map((state) => state.event);
  return {
    states,
    all: { ...visibility, _id: { $nin: dismissed } },
    unread: { ...visibility, _id: { $nin: [...dismissed, ...read] } },
  };
}

export const getNotifications = async ({
  userId,
  page = 1,
  limit = 20,
  unreadOnly = false,
}) => {
  const filters = await getNotificationFilters(userId);
  const filter = unreadOnly ? filters.unread : filters.all;
  const [events, total, unreadCount] = await Promise.all([
    ActivityEvent.find(filter)
      .sort({ occurredAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select("type actor faction sourceType sourceId details occurredAt")
      .lean(),
    ActivityEvent.countDocuments(filter),
    ActivityEvent.countDocuments(filters.unread),
  ]);
  const stateByEvent = new Map(
    filters.states.map((state) => [state.event.toString(), state]),
  );
  return {
    notifications: events.map((event) => ({
      ...event,
      read: Boolean(stateByEvent.get(event._id.toString())?.readAt),
    })),
    unreadCount,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const getUnreadNotificationCount = async (userId) => {
  const filters = await getNotificationFilters(userId);
  const unreadCount = await ActivityEvent.countDocuments(filters.unread);
  return { unreadCount };
};

export const updateNotificationState = async ({
  userId,
  eventIds,
  all = false,
  dismiss = false,
  type,
}) => {
  const visibility = await getNotificationVisibility(userId);
  const now = new Date();
  const events = await ActivityEvent.find({
    ...visibility,
    ...(type ? { type } : {}),
    ...(all ? { occurredAt: { $lte: now } } : { _id: { $in: eventIds } }),
  })
    .select("_id")
    .lean();
  if (!all && events.length !== eventIds.length) {
    throw new NotFoundError("One or more notifications were not found");
  }
  for (let offset = 0; offset < events.length; offset += 500) {
    await NotificationState.bulkWrite(
      events.slice(offset, offset + 500).map((event) => ({
        updateOne: {
          filter: { user: userId, event: event._id },
          update: {
            $set: dismiss ? { dismissedAt: now, readAt: now } : { readAt: now },
            $setOnInsert: { user: userId, event: event._id },
          },
          upsert: true,
        },
      })),
    );
  }
};
