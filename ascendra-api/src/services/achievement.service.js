import Achievement from "../models/Achievement.js";
import User from "../models/User.js";
import UserAchievement from "../models/UserAchievement.js";
import { awardXP } from "./xp.service.js";
import mongoose from "mongoose";
import PersonalRecord from "../models/PersonalRecord.js";
import { getProgressFromXP } from "../utils/progression.js";
import Verification from "../models/Verification.js";
import {
  DISTANCE_TOLERANCE_MILES,
  RUNNING_PR_DISTANCES,
  STRENGTH_PR_REPS,
} from "./personalRecord.service.js";
import WorkoutSession from "../models/WorkoutSession.js";
import { DateTime } from "luxon";
import { APP_TIME_ZONE } from "../config/app.js";

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

export const checkPersonalRecordCountAchievements = async ({
  userId,
  personalRecordId,
  mongoSession = null,
}) => {
  const personalRecordCount = await PersonalRecord.countDocuments({
    user: userId,
  }).session(mongoSession);

  const achievements = await Achievement.find({
    requirementType: "personal_record_count",
    isActive: true,
    "requirement.value": {
      $lte: personalRecordCount,
    },
  })
    .select("+slug")
    .session(mongoSession);

  const unlockedAchievements = [];

  for (const achievement of achievements) {
    const unlockResult = await unlockAchievement({
      userId,
      achievementSlug: achievement.slug,
      sourceType: "personal_record",
      source: personalRecordId,
      sourceModel: "PersonalRecord",
      mongoSession,
    });
    if (unlockResult) {
      unlockedAchievements.push(unlockResult);
    }
  }
  return unlockedAchievements;
};

export const checkLevelReachedAchievements = async ({
  userId,
  mongoSession = null,
}) => {
  const user = await User.findById(userId)
    .select("lifetimeXP")
    .session(mongoSession);

  if (!user) {
    return [];
  }

  const progression = getProgressFromXP(user.lifetimeXP ?? 0);
  const currentLevel = progression.level;

  const achievements = await Achievement.find({
    requirementType: "level_reached",
    isActive: true,
    "requirement.value": {
      $lte: currentLevel,
    },
  })
    .select("+slug")
    .session(mongoSession);

  const unlockedAchievements = [];

  for (const achievement of achievements) {
    const unlockResult = await unlockAchievement({
      userId,
      achievementSlug: achievement.slug,
      sourceType: "progression",
      source: null,
      sourceModel: null,
      mongoSession,
    });

    if (unlockResult) {
      unlockedAchievements.push(unlockResult);
    }
  }
  return unlockedAchievements;
};

export const checkEchelonReachedAchievements = async ({
  userId,
  mongoSession = null,
}) => {
  const user = await User.findById(userId)
    .select("lifetimeXP")
    .session(mongoSession);

  if (!user) {
    return [];
  }

  const progression = getProgressFromXP(user.lifetimeXP ?? 0);

  const currentEchelon = progression.echelon;

  if (currentEchelon === null) {
    return [];
  }

  const achievements = await Achievement.find({
    requirementType: "echelon_reached",
    isActive: true,
    "requirement.value": {
      $lte: currentEchelon,
    },
  })
    .select("+slug")
    .session(mongoSession);

  const unlockedAchievements = [];

  for (const achievement of achievements) {
    const unlockResult = await unlockAchievement({
      userId,
      achievementSlug: achievement.slug,
      sourceType: "echelon",
      source: null,
      sourceModel: null,
      mongoSession,
    });

    if (unlockResult) {
      unlockedAchievements.push(unlockResult);
    }
  }
  return unlockedAchievements;
};

export const checkVerificationCountAchievements = async ({
  userId,
  verificationId,
  mongoSession,
}) => {
  const verificationCount = await Verification.countDocuments({
    user: userId,
    status: "approved",
  }).session(mongoSession);

  const achievements = await Achievement.find({
    requirementType: "verification_count",
    isActive: true,
    "requirement.value": {
      $lte: verificationCount,
    },
  })
    .select("+slug")
    .session(mongoSession);

  const unlockedAchievements = [];

  for (const achievement of achievements) {
    const unlockResult = await unlockAchievement({
      userId,
      achievementSlug: achievement.slug,
      sourceType: "verification",
      source: verificationId,
      sourceModel: "Verification",
      mongoSession,
    });

    if (unlockResult) {
      unlockedAchievements.push(unlockResult);
    }
  }
  return unlockedAchievements;
};

export const checkVerifiedPerformanceAchievements = async ({
  verification,
  mongoSession = null,
}) => {
  const achievements = await Achievement.find({
    requirementType: "verified_performance",
    isActive: true,
    "requirement.exercise": verification.exercise,
  })
    .select("+slug")
    .session(mongoSession);

  let recordCategory = null;
  let performanceValue = null;

  if (verification.measurementType === "weight_reps") {
    performanceValue = verification.performance.weightLbs;
    if (STRENGTH_PR_REPS.has(verification.performance.reps)) {
      recordCategory = `${verification.performance.reps}RM`;
    }
  }

  if (verification.measurementType === "reps") {
    performanceValue = verification.performance.reps;
  }

  if (verification.measurementType === "time") {
    performanceValue = verification.performance.timeSeconds;
  }

  if (verification.measurementType === "duration") {
    performanceValue = verification.performance.timeSeconds;
  }

  if (verification.measurementType === "distance_time") {
    const matchedDistance = RUNNING_PR_DISTANCES.find(
      (distance) =>
        Math.abs(
          distance.distanceMiles - verification.performance.distanceMiles,
        ) <= DISTANCE_TOLERANCE_MILES,
    );

    if (matchedDistance) {
      recordCategory = matchedDistance.category;
      performanceValue = verification.performance.timeSeconds;
    }
  }

  if (performanceValue == null) {
    return [];
  }

  const unlockedAchievements = [];

  for (const achievement of achievements) {
    const requiredValue = achievement.requirement.value;

    let requirementMet = false;

    if (
      ["weight_reps", "reps", "duration"].includes(verification.measurementType)
    ) {
      requirementMet = performanceValue >= requiredValue;
    }

    if (["time", "distance_time"].includes(verification.measurementType)) {
      requirementMet = performanceValue <= requiredValue;
    }

    if (achievement.requirement.recordCategory) {
      if (achievement.requirement.recordCategory !== recordCategory) {
        continue;
      }
    }
    if (!requirementMet) {
      continue;
    }

    const unlockResult = await unlockAchievement({
      userId: verification.user,
      achievementSlug: achievement.slug,
      sourceType: "verification",
      source: verification._id,
      sourceModel: "Verification",
      mongoSession,
    });

    if (unlockResult) {
      unlockedAchievements.push(unlockResult);
    }
  }
  return unlockedAchievements;
};

export const checkWorkoutOfTheWeekCountAchievements = async ({
  userId,
  workoutSessionId,
  mongoSession = null,
}) => {
  const workoutOfTheWeekCount = await WorkoutSession.countDocuments({
    user: userId,
    sourceType: "workout_of_the_week",
    status: "completed",
  }).session(mongoSession);

  const achievements = await Achievement.find({
    requirementType: "wotw_count",
    isActive: true,
    "requirement.value": {
      $lte: workoutOfTheWeekCount,
    },
  })
    .select("+slug")
    .session(mongoSession);

  const unlockedAchievements = [];

  for (const achievement of achievements) {
    const unlockResult = await unlockAchievement({
      userId,
      achievementSlug: achievement.slug,
      sourceType: "workout_session",
      source: workoutSessionId,
      sourceModel: "WorkoutSession",
      mongoSession,
    });

    if (unlockResult) {
      unlockedAchievements.push(unlockResult);
    }
  }

  return unlockedAchievements;
};

export const checkWorkoutStreakAchievements = async ({
  userId,
  workoutSessionId,
  mongoSession = null,
}) => {
  const completedSessions = await WorkoutSession.find({
    user: userId,
    status: "completed",
    completedAt: { $ne: null },
  })
    .select("completedAt")
    .sort({ completedAt: -1 })
    .session(mongoSession);

  const completedDays = [
    ...new Set(
      completedSessions.map((session) =>
        DateTime.fromJSDate(session.completedAt)
          .setZone(APP_TIME_ZONE)
          .toISODate(),
      ),
    ),
  ];

  let currentStreak = 0;

  for (let i = 0; i < completedDays.length; i += 1) {
    const currentDay = DateTime.fromISO(completedDays[i], {
      zone: APP_TIME_ZONE,
    });

    if (i === 0) {
      currentStreak == 1;
      continue;
    }
    const previousDay = DateTime.fromISO(completedDays[i - 1], {
      zone: APP_TIME_ZONE,
    });

    const expectedDay = previousDay.minus({ days: 1 });

    if (currentDay.hasSame(expectedDay, "day")) {
      currentStreak += 1;
    } else {
      break;
    }
  }

  const achievements = await Achievement.find({
    requirementType: "workout_streak",
    isActive: true,
    "requirement.value": {
      $lte: currentStreak,
    },
  })
    .select("+slug")
    .session(mongoSession);

  let unlockedAchievements = [];

  for (const achievement of achievements) {
    const unlockResult = await unlockAchievement({
      userId,
      achievementSlug: achievement.slug,
      sourceType: "workout_session",
      source: workoutSessionId,
      sourceModel: "WorkoutSession",
      mongoSession,
    });

    if (unlockResult) {
      unlockedAchievements.push(unlockResult);
    }
  }

  return unlockedAchievements;
};

export const checkWorkoutTotalRepsAchievement = async ({
  workoutSession,
  mongoSession = null,
}) => {
  const totalReps = workoutSession.exercises.reduce(
    (workoutTotal, exercise) => {
      if (exercise.skipped) {
        return workoutTotal;
      }

      if (!["weight_reps", "reps"].includes(exercise.measurementType)) {
        return workoutTotal;
      }

      const exerciseReps =
        exercise.actual.sets?.reduce(
          (setTotal, set) => setTotal + (set.reps ?? 0),
          0,
        ) ?? 0;

      return workoutTotal + exerciseReps;
    },
    0,
  );

  const achievements = await Achievement.find({
    requirementType: "workout_total_reps",
    isActive: true,
    "requirement.value": {
      $lte: totalReps,
    },
  })
    .select("+slug")
    .session(mongoSession);

  const unlockedAchievements = [];

  for (const achievement of achievements) {
    const unlockResult = await unlockAchievement({
      userId: workoutSession.user,
      achievementSlug: achievement.slug,
      sourceType: "workout_session",
      source: workoutSession._id,
      sourceModel: "WorkoutSession",
      mongoSession,
    });

    if (unlockResult) {
      unlockedAchievements.push(unlockResult);
    }
  }

  return unlockedAchievements;
};

export const checkWorkoutTimeOfDayAchievements = async ({
  workoutSession,
  mongoSession = null,
}) => {
  const workoutStartTime = DateTime.fromJSDate(
    workoutSession.startedAt,
  ).setZone(APP_TIME_ZONE);

  const achievements = await Achievement.find({
    requirementType: "workout_time_of_day",
    isActive: true,
  })
    .select("+slug")
    .session(mongoSession);

  const unlockedAchievements = [];

  for (const achievement of achievements) {
    const thresholdTime = workoutStartTime.startOf("day").set({
      hour: achievement.requirement.value,
    });

    const qualifies =
      achievement.requirement.operator === "before"
        ? workoutStartTime < thresholdTime
        : workoutStartTime > thresholdTime;

    if (!qualifies) {
      continue;
    }

    const unlockResult = await unlockAchievement({
      userId: workoutSession.user,
      achievementSlug: achievement.slug,
      sourceType: "workout_session",
      source: workoutSession._id,
      sourceModel: "WorkoutSession",
      mongoSession,
    });

    if (unlockResult) {
      unlockedAchievements.push(unlockResult);
    }
  }

  return unlockedAchievements;
};
