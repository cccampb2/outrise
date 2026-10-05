import { ACCESSIBLE_ACCOUNT_STATUSES } from "../constants/accountStatus.js";
import User from "../models/User.js";
import UserAchievement from "../models/UserAchievement.js";
import Verification from "../models/Verification.js";
import Achievement from "../models/Achievement.js";
import NotFoundError from "../errors/NotFoundError.js";

async function ensurePublicUser(userId) {
  const user = await User.exists({
    _id: userId,
    accountStatus: { $in: ACCESSIBLE_ACCOUNT_STATUSES },
  });
  if (!user) {
    throw new NotFoundError("User not found");
  }
}

const getPublicAchievement = (achievement, unlocked) => {
  if (!achievement?.isSecret) {
    return achievement;
  }
  return {
    ...achievement,
    name: unlocked ? achievement.name : "Secret achievement",
    description: "",
    category: unlocked ? achievement.category : "",
    badgeKey: unlocked ? achievement.badgeKey : "",
  };
};

export const getProfileAchievements = async ({
  userId,
  page,
  limit,
  view = "unlocked",
}) => {
  await ensurePublicUser(userId);
  if (view === "catalog") {
    const unlocks = await UserAchievement.find({ user: userId })
      .select("achievement unlockedAt")
      .lean();
    const unlockById = new Map(
      unlocks.map((unlock) => [unlock.achievement.toString(), unlock]),
    );
    const filter = {
      $or: [
        { isActive: true },
        { _id: { $in: unlocks.map((unlock) => unlock.achievement) } },
      ],
    };
    const [achievements, total] = await Promise.all([
      Achievement.find(filter)
        .sort({ name: 1, _id: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select("name description category badgeKey isSecret")
        .lean(),
      Achievement.countDocuments(filter),
    ]);
    return {
      achievements: achievements.map((achievement) => {
        const unlock = unlockById.get(achievement._id.toString());
        return {
          id: achievement._id,
          unlocked: Boolean(unlock),
          unlockedAt: unlock?.unlockedAt ?? null,
          achievement: getPublicAchievement(achievement, Boolean(unlock)),
        };
      }),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
  const filter = { user: userId };
  const [unlocks, total] = await Promise.all([
    UserAchievement.find(filter)
      .sort({ unlockedAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select("achievement unlockedAt")
      .populate("achievement", "name description category badgeKey isSecret")
      .lean(),
    UserAchievement.countDocuments(filter),
  ]);
  return {
    achievements: unlocks.map((unlock) => ({
      id: unlock._id,
      unlocked: true,
      unlockedAt: unlock.unlockedAt,
      achievement: getPublicAchievement(unlock.achievement, true),
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const getProfilePerformances = async ({ userId, page, limit }) => {
  await ensurePublicUser(userId);
  const filter = { user: userId, status: "approved" };
  const [records, total] = await Promise.all([
    Verification.find(filter)
      .sort({ reviewedAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select("exercise measurementType performance reviewedAt createdAt")
      .populate("exercise", "name")
      .lean(),
    Verification.countDocuments(filter),
  ]);
  return {
    performances: records.map((record) => ({
      id: record._id,
      exercise: record.exercise,
      measurementType: record.measurementType,
      performance: record.performance,
      approvedAt: record.reviewedAt,
      submittedAt: record.createdAt,
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};
