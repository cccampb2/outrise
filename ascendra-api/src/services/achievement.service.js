import Achievement from "../models/Achievement.js";
import User from "../models/User.js";
import UserAchievement from "../models/UserAchievement.js";
import { awardXP } from "./xp.service.js";
import mongoose from "mongoose";

const performAchievementUnlock = async ({
  userId,
  achievement,
  sourceType,
  source,
  sourceModel,
  mongoSession,
}) => {
  const existingUnlock = await UserAchievement.findOne({
    user: userId,

    achievement: achievement._id,
  })
    .select("_id")
    .session(mongoSession);

  if (existingUnlock) {
    return null;
  }

  const userAchievement = new UserAchievement({
    user: userId,
    achievement: achievement._id,
    sourceType,
    source,
    sourceModel,
  });

  await userAchievement.save({ session: mongoSession });

  const idempotencyKey = `user:${userId}:achievement:${achievement._id}`;

  const xpResult = await awardXP({
    userId,
    amount: achievement.xpReward,
    sourceType: "achievement",
    sourceId: achievement._id,
    idempotencyKey,
    reason: `Unlocked achievement: ${achievement.name}`,
    mongoSession,
  });

  return { userAchievement, achievement, xpResult };
};

export const unlockAchievement = async ({
  userId,
  achievementSlug,
  sourceType,
  source = null,
  sourceModel = null,
  mongoSession = null,
}) => {
  const achievement = await Achievement.findOne({
    slug: achievementSlug,
    isActive: true,
  })
    .select("+slug")
    .session(mongoSession);

  if (!achievement) {
    return null;
  }

  if (mongoSession) {
    return performAchievementUnlock({
      userId,
      achievement,
      sourceType,
      source,
      sourceModel,
      mongoSession,
    });
  }

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const result = await performAchievementUnlock({
      userId,
      achievement,
      sourceType,
      source,
      sourceModel,
      mongoSession: session,
    });

    await session.commitTransaction();

    return result;
  } catch (error) {
    await session.abortTransaction();
    if (error?.code === 11000) {
      return null;
    }
    throw error;
  } finally {
    await session.endSession();
  }
};

export const checkWorkoutCountAchievements = async ({
  userId,
  workoutSessionId,
  mongoSession = null,
}) => {
  const user = await User.findById(userId)
    .select("totalWorkouts")
    .session(mongoSession);

  if (!user) {
    return [];
  }

  const achievements = await Achievement.find({
    requirementType: "workout_count",
    isActive: true,
    "requirement.value": { $lte: user.totalWorkouts },
  })
    .select("+slug")
    .session(mongoSession);

  const unlockedAchievements = [];

  for (const achievement of achievements) {
    const unlockedResult = await unlockAchievement({
      userId,
      achievementSlug: achievement.slug,
      sourceType: "workout_session",
      source: workoutSessionId,
      sourceModel: "WorkoutSession",
      mongoSession,
    });

    if (unlockedResult) {
      unlockedAchievements.push(unlockedResult);
    }
  }
  return unlockedAchievements;
};
