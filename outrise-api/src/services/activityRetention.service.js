import mongoose from "mongoose";
import ActivityEvent from "../models/ActivityEvent.js";
import NotificationState from "../models/NotificationState.js";
import ActivityDismissal from "../models/ActivityDismissal.js";

export const ACTIVITY_RETENTION_DAYS = 90;
const BATCH_SIZE = 200;

async function removeOrphanStates(model) {
  // A read/dismiss request already in progress can save state after its event is deleted.
  const cursor = model
    .aggregate([
      {
        $lookup: {
          from: ActivityEvent.collection.name,
          localField: "event",
          foreignField: "_id",
          pipeline: [{ $project: { _id: 1 } }],
          as: "retainedEvent",
        },
      },
      { $match: { "retainedEvent.0": { $exists: false } } },
      { $project: { _id: 1 } },
    ])
    .cursor({ batchSize: BATCH_SIZE });
  let ids = [],
    deleted = 0;
  for await (const row of cursor) {
    ids.push(row._id);
    if (ids.length === BATCH_SIZE) {
      const result = await model.deleteMany({ _id: { $in: ids } });
      deleted += result.deletedCount;
      ids = [];
    }
  }
  if (ids.length) {
    const result = await model.deleteMany({ _id: { $in: ids } });
    deleted += result.deletedCount;
  }
  return deleted;
}

export async function cleanupExpiredActivity({ now = new Date() } = {}) {
  const cutoff = new Date(
    now.getTime() - ACTIVITY_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  );
  const result = {
    eventsDeleted: 0,
    notificationStatesDeleted: 0,
    activityDismissalsDeleted: 0,
  };
  const session = await mongoose.startSession();
  try {
    while (true) {
      const batch = await session.withTransaction(async () => {
        const events = await ActivityEvent.find({
          occurredAt: { $lte: cutoff },
        })
          .sort({ occurredAt: 1, _id: 1 })
          .limit(BATCH_SIZE)
          .select("_id")
          .session(session)
          .lean();
        if (!events.length) return null;
        const ids = events.map((event) => event._id);
        const notifications = await NotificationState.deleteMany(
          { event: { $in: ids } },
          { session },
        );
        const dismissals = await ActivityDismissal.deleteMany(
          { event: { $in: ids } },
          { session },
        );
        const removed = await ActivityEvent.deleteMany(
          { _id: { $in: ids }, occurredAt: { $lte: cutoff } },
          { session },
        );
        return {
          eventsDeleted: removed.deletedCount,
          notificationStatesDeleted: notifications.deletedCount,
          activityDismissalsDeleted: dismissals.deletedCount,
        };
      });
      if (!batch) break;
      // Count only the committed transaction, including when MongoDB retries it.
      result.eventsDeleted += batch.eventsDeleted;
      result.notificationStatesDeleted += batch.notificationStatesDeleted;
      result.activityDismissalsDeleted += batch.activityDismissalsDeleted;
    }
  } finally {
    await session.endSession();
  }
  result.notificationStatesDeleted +=
    await removeOrphanStates(NotificationState);
  result.activityDismissalsDeleted +=
    await removeOrphanStates(ActivityDismissal);
  return result;
}
