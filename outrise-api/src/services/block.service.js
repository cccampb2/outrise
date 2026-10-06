import mongoose from "mongoose";
import UserBlock from "../models/UserBlock.js";
import User from "../models/User.js";
import Friendship from "../models/Friendship.js";
import BadRequestError from "../errors/BadRequestError.js";
import ForbiddenError from "../errors/ForbiddenError.js";
import NotFoundError from "../errors/NotFoundError.js";

export async function getBlockRelationship({ userId, otherUserId, session }) {
  if (userId.toString() === otherUserId.toString())
    return { blocked: false, blockedByMe: false };
  const rows = await UserBlock.find({
    $or: [
      { blocker: userId, blocked: otherUserId },
      { blocker: otherUserId, blocked: userId },
    ],
  })
    .select("blocker")
    .session(session ?? null)
    .lean();
  return {
    blocked: rows.length > 0,
    blockedByMe: rows.some(
      (row) => row.blocker.toString() === userId.toString(),
    ),
  };
}
export async function ensureNotBlocked(params) {
  if ((await getBlockRelationship(params)).blocked)
    throw new ForbiddenError("Contact with this user is unavailable.");
}
export async function getBlockedUserIds(userId) {
  const rows = await UserBlock.find({
    $or: [{ blocker: userId }, { blocked: userId }],
  })
    .select("blocker blocked")
    .lean();
  return rows.map((row) =>
    row.blocker.toString() === userId.toString() ? row.blocked : row.blocker,
  );
}
// Both contact operations and blocks write the same users inside their transaction.
// MongoDB retries a conflicting transaction, which then sees the newly saved block.
export async function lockContactUsers({ userId, otherUserId, session }) {
  for (const id of [userId, otherUserId].sort((a, b) =>
    a.toString().localeCompare(b.toString()),
  )) {
    const result = await User.updateOne(
      { _id: id, deletionRequestedAt: null },
      { $inc: { accountMutationRevision: 1 } },
      { session },
    );
    if (result.matchedCount !== 1) throw new NotFoundError("User not found");
  }
}
export async function blockUser({ userId, otherUserId }) {
  if (userId.toString() === otherUserId.toString())
    throw new BadRequestError("You cannot block yourself.");
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await lockContactUsers({ userId, otherUserId, session });
      await UserBlock.updateOne(
        { blocker: userId, blocked: otherUserId },
        { $setOnInsert: { blocker: userId, blocked: otherUserId } },
        { upsert: true, runValidators: true, session },
      );
      await Friendship.deleteMany(
        {
          $or: [
            { requester: userId, recipient: otherUserId },
            { requester: otherUserId, recipient: userId },
          ],
        },
        { session },
      );
    });
  } finally {
    await session.endSession();
  }
}
export async function unblockUser({ userId, otherUserId }) {
  await UserBlock.deleteOne({ blocker: userId, blocked: otherUserId });
}
export async function getBlockedUsers({ userId, page = 1, limit = 25 }) {
  const rows = await UserBlock.find({ blocker: userId })
    .sort({ createdAt: -1, _id: -1 })
    .skip((page - 1) * limit)
    .limit(limit + 1)
    .populate("blocked", "username profileImage")
    .lean();
  return {
    users: rows.slice(0, limit).map((row) => ({
      id: row.blocked?._id ?? null,
      username: row.blocked?.username ?? "Deleted account",
      profileImage: row.blocked?.profileImage ?? null,
      blockedAt: row.createdAt,
    })),
    pagination: { page, limit, hasMore: rows.length > limit },
  };
}
