import { ACCESSIBLE_ACCOUNT_STATUSES, canAccessAccount } from "../constants/accountStatus.js";
import ActivityEvent from "../models/ActivityEvent.js";
import ActivityDismissal from "../models/ActivityDismissal.js";
import NotFoundError from "../errors/NotFoundError.js";
import Friendship from "../models/Friendship.js";
import User from "../models/User.js";

async function getActivityVisibility(userId) {
  const friendships = await Friendship.find({
    status: "accepted",
    $or: [{ requester: userId }, { recipient: userId }],
  })
    .select("requester recipient")
    .lean();
  const actorIds = [
    userId,
    ...friendships.map((friendship) =>
      friendship.requester.toString() === userId.toString()
        ? friendship.recipient
        : friendship.requester,
    ),
  ];
  const activeIds = await User.find({
    _id: { $in: actorIds },
    accountStatus: { $in: ACCESSIBLE_ACCOUNT_STATUSES },
  }).distinct("_id");
  const user = await User.findById(userId)
    .select("faction accountStatus")
    .lean();
  const audiences = [
    { recipient: userId, audience: "personal" },
    { actor: { $in: activeIds }, audience: "friends" },
    { audience: "global" },
  ];
  if (canAccessAccount(user?.accountStatus) && user.faction)
    audiences.push({ audience: "faction", faction: user.faction });
  return { $or: audiences };
}

export const dismissActivityEvents = async ({ userId, eventIds }) => {
  // Only events visible to this user may be dismissed.
  const events = await ActivityEvent.find({
    ...(await getActivityVisibility(userId)),
    _id: { $in: eventIds },
  })
    .select("_id")
    .lean();
  if (events.length !== eventIds.length) {
    throw new NotFoundError("One or more activity events were not found");
  }
  const dismissedAt = new Date();
  await Promise.all(
    events.map((event) =>
      ActivityDismissal.updateOne(
        { user: userId, event: event._id },
        { $setOnInsert: { user: userId, event: event._id, dismissedAt } },
        { upsert: true, runValidators: true },
      ),
    ),
  );
};

export const dismissAllActivityEvents = async ({ userId }) => {
  const dismissedAt = new Date();
  const dismissedIds = await ActivityDismissal.find({ user: userId }).distinct(
    "event",
  );
  const events = ActivityEvent.find({
    ...(await getActivityVisibility(userId)),
    _id: { $nin: dismissedIds },
    // Preserve events created after this clear-all request began.
    createdAt: { $lte: dismissedAt },
  })
    .select("_id")
    .lean()
    .cursor();

  let operations = [];
  for await (const event of events) {
    operations.push({
      updateOne: {
        filter: { user: userId, event: event._id },
        update: {
          $setOnInsert: { user: userId, event: event._id, dismissedAt },
        },
        upsert: true,
      },
    });
    if (operations.length === 500) {
      await ActivityDismissal.bulkWrite(operations);
      operations = [];
    }
  }
  if (operations.length > 0) await ActivityDismissal.bulkWrite(operations);
};

export const createActivityEvent = async (event, { mongoSession } = {}) => {
  // Validate even when an upsert finds an existing event.
  await new ActivityEvent(event).validate();
  return ActivityEvent.findOneAndUpdate(
    { idempotencyKey: event.idempotencyKey },
    { $setOnInsert: event },
    { upsert: true, new: true, runValidators: true, session: mongoSession },
  );
};

export const getActivityFeed = async ({ userId, page = 1, limit = 25 }) => {
  const dismissedIds = await ActivityDismissal.find({ user: userId }).distinct(
    "event",
  );
  const filter = {
    ...(await getActivityVisibility(userId)),
    _id: { $nin: dismissedIds },
  };
  const [events, totalEvents] = await Promise.all([
    ActivityEvent.find(filter)
      .sort({ occurredAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select("type actor faction sourceType sourceId details occurredAt")
      .lean(),
    ActivityEvent.countDocuments(filter),
  ]);
  return {
    events,
    pagination: {
      page,
      limit,
      totalEvents,
      totalPages: Math.ceil(totalEvents / limit),
    },
  };
};
