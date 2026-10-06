import mongoose from "mongoose";
import { DateTime } from "luxon";
import IssueReport from "../models/IssueReport.js";
import Suggestion from "../models/Suggestion.js";
import AccountModeration from "../models/AccountModeration.js";
import User from "../models/User.js";

export const SUPPORT_RETENTION_MONTHS = 12;

export function supportRetentionCutoff(now) {
  return DateTime.fromJSDate(now, { zone: "utc" })
    .minus({ months: SUPPORT_RETENTION_MONTHS })
    .toJSDate();
}

export async function cleanupSupportRecords({ now = new Date() } = {}) {
  const cutoff = supportRetentionCutoff(now);
  // Give legacy closed records a full retention period rather than guessing a date.
  await IssueReport.updateMany(
    { status: "resolved", resolvedAt: null },
    { $set: { resolvedAt: now } },
  );
  await Suggestion.updateMany(
    { status: "closed", closedAt: null },
    { $set: { closedAt: now } },
  );
  const reports = await IssueReport.deleteMany({
    status: "resolved",
    resolvedAt: { $type: "date", $lte: cutoff },
    replies: { $not: { $elemMatch: { status: "pending" } } },
  });
  const suggestions = await Suggestion.deleteMany({
    status: "closed",
    closedAt: { $type: "date", $lte: cutoff },
  });
  return {
    reportsDeleted: reports.deletedCount,
    suggestionsDeleted: suggestions.deletedCount,
  };
}

export async function cleanupModerationRecords({ now = new Date() } = {}) {
  const cutoff = supportRetentionCutoff(now);
  const cursor = AccountModeration.aggregate([
    {
      $match: { $or: [{ resolvedAt: null }, { resolvedAt: { $lte: cutoff } }] },
    },
    { $group: { _id: "$user" } },
  ]).cursor({ batchSize: 100 });
  const session = await mongoose.startSession();
  let moderationRecordsDeleted = 0;
  try {
    for await (const row of cursor) {
      const deleted = await session.withTransaction(async () => {
        // Writing the user makes cleanup conflict with a concurrent moderation change.
        const user = await User.updateOne(
          {
            _id: row._id,
            accountStatus: "active",
            deletionRequestedAt: null,
          },
          { $inc: { accountMutationRevision: 1 } },
          { session },
        );
        if (user.matchedCount !== 1) return 0;
        await AccountModeration.updateMany(
          { user: row._id, resolvedAt: null },
          { $set: { resolvedAt: now } },
          { session },
        );
        const removed = await AccountModeration.deleteMany(
          {
            user: row._id,
            resolvedAt: { $type: "date", $lte: cutoff },
          },
          { session },
        );
        return removed.deletedCount;
      });
      moderationRecordsDeleted += deleted;
    }
  } finally {
    await session.endSession();
  }
  return { moderationRecordsDeleted };
}
