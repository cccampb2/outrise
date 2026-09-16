import User from "../models/User.js";
import { getProgressFromXP } from "../utils/progression.js";

export const getZenithLeaderBoard = async () => {
  const users = await User.find({
    accountStatus: "active",
    lifetimeXP: {
      $gt: 0,
    },
  })
    .sort({ lifetimeXP: -1, _id: -1 })
    .limit(25)
    .select("username lifetimeXP faction")
    .lean();

  const leaderboard = users.map((user, index) => {
    const rank = index + 1;

    const progression = getProgressFromXP(user.lifetimeXP ?? 0);

    return {
      userId: user._id,
      username: user.username,
      lifetimeXP: user.lifetimeXP ?? 0,
      level: progression.level,
      echelon: progression.echelon,
      faction: user.faction,
      rank,
      zenithRank: rank,
    };
  });

  return leaderboard;
};

export const getGlobalLeaderboard = async ({ page, limit }) => {
  const skip = (page - 1) * limit;

  const query = {
    accountStatus: "active",
    lifetimeXP: {
      $gt: 0,
    },
  };

  const users = await User.find(query)
    .sort({ lifetimeXP: -1, _id: 1 })
    .skip(skip)
    .limit(limit)
    .select("username lifetimeXP faction")
    .lean();

  const totalUsers = await User.countDocuments(query);

  const totalPages = Math.ceil(totalUsers / limit);

  const leaderboard = users.map((user, index) => {
    const rank = skip + index + 1;
    const progression = getProgressFromXP(user.lifetimeXP ?? 0);

    return {
      userId: user._id,
      username: user.username,
      lifetimeXP: user.lifetimeXP ?? 0,
      level: progression.level,
      echelon: progression.echelon,
      faction: user.faction,
      rank,
      zenithRank: rank <= 25 ? rank : null,
    };
  });

  return {
    leaderboard,
    pagination: {
      page,
      limit,
      totalUsers,
      totalPages,
    },
  };
};

export const getUserGlobalRank = async (userId) => {
  const user = await User.findById(userId)
    .select("lifetimeXP accountStatus")
    .lean();

  if (!user || user.accountStatus !== "active" || user.lifetimeXP <= 0) {
    return {
      globalRank: null,
      zenithRank: null,
    };
  }

  const usersAbove = await User.countDocuments({
    accountStatus: "active",
    $or: [
      { lifetimeXP: { $gt: user.lifetimeXP } },
      { lifetimeXP: user.lifetimeXP, _id: { $lt: user._id } },
    ],
  });
  const globalRank = usersAbove + 1;
  const zenithRank = globalRank <= 25 ? globalRank : null;

  return { globalRank, zenithRank };
};
