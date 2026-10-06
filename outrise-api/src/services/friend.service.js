import {
  ensureNotBlocked,
  getBlockedUserIds,
  getBlockRelationship,
  lockContactUsers,
} from "./block.service.js";
import { ACCESSIBLE_ACCOUNT_STATUSES } from "../constants/accountStatus.js";
import mongoose from "mongoose";
import { createActivityEvent } from "./activity.service.js";
import Friendship from "../models/Friendship.js";
import User from "../models/User.js";
import ForbiddenError from "../errors/ForbiddenError.js";
import ConflictError from "../errors/ConflictError.js";
import NotFoundError from "../errors/NotFoundError.js";
import { getProgressFromXP } from "../utils/progression.js";

async function getRelationshipList({ userId, page = 1, limit = 25, kind }) {
  // Aggregation does not automatically cast JWT strings to ObjectIds.
  const currentUserId = new mongoose.Types.ObjectId(userId);
  const isFriends = kind === "friends";
  const incoming = kind === "incoming";
  const match = isFriends
    ? {
        status: "accepted",
        $or: [{ requester: currentUserId }, { recipient: currentUserId }],
      }
    : {
        status: "pending",
        [incoming ? "recipient" : "requester"]: currentUserId,
      };
  const excluded = await getBlockedUserIds(userId);
  const otherUser = isFriends
    ? {
        $cond: [
          { $eq: ["$requester", currentUserId] },
          "$recipient",
          "$requester",
        ],
      }
    : incoming
      ? "$requester"
      : "$recipient";

  const [result] = await Friendship.aggregate([
    { $match: match },
    { $set: { otherUserId: otherUser } },
    { $match: { otherUserId: { $nin: excluded } } },
    {
      $lookup: {
        from: User.collection.name,
        localField: "otherUserId",
        foreignField: "_id",
        pipeline: [
          { $match: { accountStatus: { $in: ACCESSIBLE_ACCOUNT_STATUSES } } },
          {
            $project: {
              username: 1,
              role: 1,
              faction: 1,
              lifetimeXP: 1,
              profileImage: 1,
            },
          },
        ],
        as: "user",
      },
    },
    // Missing or inactive users are excluded before pagination and counting.
    { $unwind: "$user" },
    {
      $facet: {
        rows: [
          { $sort: { [isFriends ? "acceptedAt" : "createdAt"]: -1, _id: -1 } },
          { $skip: (page - 1) * limit },
          { $limit: limit },
          { $project: { user: 1, createdAt: 1, acceptedAt: 1 } },
        ],
        total: [{ $count: "count" }],
      },
    },
  ]);

  const rows = result?.rows ?? [];
  await User.populate(
    rows.map((row) => row.user),
    {
      path: "faction",
      select: "name slug colors",
    },
  );
  const entries = rows.map((row) => {
    const progression = getProgressFromXP(row.user.lifetimeXP ?? 0);
    const user = {
      id: row.user._id,
      username: row.user.username,
      role: row.user.role,
      faction: row.user.faction ?? null,
      lifetimeXP: row.user.lifetimeXP ?? 0,
      profileImage: row.user.profileImage ?? { url: null, publicId: null },
      progression: { level: progression.level, echelon: progression.echelon },
    };
    return isFriends
      ? { user, acceptedAt: row.acceptedAt }
      : { requestId: row._id, user, createdAt: row.createdAt };
  });
  const total = result?.total[0]?.count ?? 0;

  return {
    [isFriends ? "friends" : "requests"]: entries,
    pagination: {
      page,
      limit,
      [isFriends ? "totalUsers" : "totalRequests"]: total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export const getFriends = (params) =>
  getRelationshipList({ ...params, kind: "friends" });

export const getIncomingFriendRequests = (params) =>
  getRelationshipList({ ...params, kind: "incoming" });

export const getOutgoingFriendRequests = (params) =>
  getRelationshipList({ ...params, kind: "outgoing" });

function getFriendshipPair(firstUserId, secondUserId) {
  const firstId = firstUserId.toString();
  const secondId = secondUserId.toString();

  if (firstId < secondId) {
    return {
      userLow: firstUserId,
      userHigh: secondUserId,
    };
  }

  return {
    userLow: secondUserId,
    userHigh: firstUserId,
  };
}

export const getFriendshipRelationship = async ({ userId, otherUserId }) => {
  if (userId.toString() === otherUserId.toString()) {
    return { status: "none", requestId: null };
  }

  if ((await getBlockRelationship({ userId, otherUserId })).blocked)
    return { status: "blocked", requestId: null };
  const pair = getFriendshipPair(userId, otherUserId);
  const friendship = await Friendship.findOne(pair)
    .select("requester status")
    .lean();

  if (!friendship) {
    return { status: "none", requestId: null };
  }

  if (friendship.status === "accepted") {
    return { status: "friends", requestId: null };
  }

  return {
    status:
      friendship.requester.toString() === userId.toString()
        ? "outgoing"
        : "incoming",
    requestId: friendship._id,
  };
};

export const removeFriend = async ({ userId, friendId }) => {
  const { userLow, userHigh } = getFriendshipPair(userId, friendId);

  const friendship = await Friendship.findOneAndDelete({
    userLow,
    userHigh,
    status: "accepted",
  });

  if (!friendship) {
    throw new NotFoundError("Friendship not found");
  }
};

export const cancelFriendRequest = async ({ userId, requestId }) => {
  const request = await Friendship.findOneAndDelete({
    _id: requestId,
    requester: userId,
    status: "pending",
  });

  if (!request) {
    throw new NotFoundError("Pending friend request not found");
  }
};

export const declineFriendRequest = async ({ userId, requestId }) => {
  const request = await Friendship.findOneAndDelete({
    _id: requestId,
    recipient: userId,
    status: "pending",
  });

  if (!request) {
    throw new NotFoundError("Pending friend request not found");
  }
};

export const acceptFriendRequest = async ({ userId, requestId }) => {
  const request = await Friendship.findOne({
    _id: requestId,
    recipient: userId,
    status: "pending",
  });

  if (!request) {
    throw new NotFoundError("Pending friend request not found");
  }

  await ensureNotBlocked({ userId, otherUserId: request.requester });
  const recipient = await User.findOne({
    _id: userId,
    accountStatus: { $in: ACCESSIBLE_ACCOUNT_STATUSES },
  }).select("_id username");

  if (!recipient) {
    throw new ForbiddenError("Only active users can accept friend requests");
  }

  const requester = await User.findOne({
    _id: request.requester,
    accountStatus: { $in: ACCESSIBLE_ACCOUNT_STATUSES },
  }).select("_id");

  if (!requester) {
    throw new NotFoundError("User not found");
  }

  const mongoSession = await mongoose.startSession();
  try {
    return await mongoSession.withTransaction(async () => {
      await lockContactUsers({
        userId,
        otherUserId: request.requester,
        session: mongoSession,
      });
      await ensureNotBlocked({
        userId,
        otherUserId: request.requester,
        session: mongoSession,
      });
      // Recheck ownership and pending status when performing the update.
      const friendship = await Friendship.findOneAndUpdate(
        { _id: requestId, recipient: userId, status: "pending" },
        { $set: { status: "accepted", acceptedAt: new Date() } },
        { returnDocument: "after", runValidators: true, session: mongoSession },
      );

      if (!friendship) {
        throw new NotFoundError("Pending friend request not found");
      }

      await createActivityEvent(
        {
          type: "friend_request_accepted",
          actor: userId,
          audience: "personal",
          recipient: friendship.requester,
          sourceType: "friendship",
          sourceId: friendship._id,
          details: { actorUsername: recipient.username },
          idempotencyKey: `friend_request_accepted:${friendship._id}`,
          occurredAt: friendship.acceptedAt,
        },
        { mongoSession },
      );

      return friendship;
    });
  } finally {
    await mongoSession.endSession();
  }
};

export const sendFriendRequest = async ({ requesterId, recipientId }) => {
  if (requesterId.toString() === recipientId.toString()) {
    throw new ConflictError("You cannot send a friend request to yourself");
  }

  await ensureNotBlocked({ userId: requesterId, otherUserId: recipientId });
  const requester = await User.findOne({
    _id: requesterId,
    accountStatus: { $in: ACCESSIBLE_ACCOUNT_STATUSES },
  }).select("_id username");

  if (!requester) {
    throw new ForbiddenError("Only active users can send friend requests");
  }

  const recipient = await User.findOne({
    _id: recipientId,
    accountStatus: { $in: ACCESSIBLE_ACCOUNT_STATUSES },
  }).select("_id");

  if (!recipient) {
    throw new NotFoundError("User not found");
  }

  const { userLow, userHigh } = getFriendshipPair(requesterId, recipientId);

  const existingFriendship = await Friendship.findOne({
    userLow,
    userHigh,
  });

  if (existingFriendship) {
    if (existingFriendship.status === "accepted") {
      throw new ConflictError("You are already friends with this user");
    }

    const requesterAlreadySentRequest =
      existingFriendship.requester.toString() === requesterId.toString();

    if (requesterAlreadySentRequest) {
      throw new ConflictError(
        "You have already sent this user a friend request",
      );
    }

    throw new ConflictError("This user has already sent you a friend request");
  }

  try {
    const mongoSession = await mongoose.startSession();
    try {
      return await mongoSession.withTransaction(async () => {
        await lockContactUsers({
          userId: requesterId,
          otherUserId: recipientId,
          session: mongoSession,
        });
        await ensureNotBlocked({
          userId: requesterId,
          otherUserId: recipientId,
          session: mongoSession,
        });
        const [friendship] = await Friendship.create(
          [
            {
              requester: requesterId,
              recipient: recipientId,
              userLow,
              userHigh,
              status: "pending",
            },
          ],
          { session: mongoSession },
        );

        await createActivityEvent(
          {
            type: "friend_request_received",
            actor: requesterId,
            audience: "personal",
            recipient: recipientId,
            sourceType: "friendship",
            sourceId: friendship._id,
            details: { actorUsername: requester.username },
            idempotencyKey: `friend_request_received:${friendship._id}`,
            occurredAt: friendship.createdAt,
          },
          { mongoSession },
        );

        return friendship;
      });
    } finally {
      await mongoSession.endSession();
    }
  } catch (error) {
    if (
      error instanceof mongoose.mongo.MongoServerError &&
      error.code === 11000
    ) {
      throw new ConflictError(
        "A friendship or friend request already exists between these users",
      );
    }

    throw error;
  }
};
