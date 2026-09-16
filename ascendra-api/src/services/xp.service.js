import User from "../models/User.js";
import XPTransaction from "../models/XPtransaction.js";
import BadRequestError from "../errors/BadRequestError.js";
import Exercise from "../models/Exercise.js";
import { getProgressFromXP } from "../utils/progression.js";
import { ECHELON_REWARDS } from "../config/progression.js";
import NotFoundError from "../errors/NotFoundError.js";
import { addSeasonContribution } from "./seasonContribution.service.js";

const SEASON_ELIGIBLE_XP_SOURCES = new Set([
  "workout_completion",
  "personal_record",
  "workout_of_the_week",
]);

export const awardXP = async ({
  userId,
  amount,
  sourceType,
  sourceId = null,
  idempotencyKey,
  reason,
  mongoSession = null,
}) => {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new BadRequestError("XP amount must be a positive whole number");
  }

  if (typeof idempotencyKey !== "string" || idempotencyKey.trim() === "") {
    throw new BadRequestError("XP award requires an idempotency key");
  }

  const xpTransaction = new XPTransaction({
    user: userId,
    amount,
    sourceType,
    sourceId,
    reason,
    idempotencyKey,
  });

  await xpTransaction.save({ session: mongoSession });

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $inc: { lifetimeXP: amount } },
    { returnDocument: "after", runValidators: true, session: mongoSession },
  );

  if (!updatedUser) {
    throw new NotFoundError("User not found");
  }

  const countsTowardSeason = SEASON_ELIGIBLE_XP_SOURCES.has(sourceType);
  if (countsTowardSeason) {
    await addSeasonContribution({ userId, amount, mongoSession });
  }

  return { updatedUser, xpTransaction };
};

export const calculateWorkoutXP = async ({
  workoutSession,
  mongoSession = null,
}) => {
  const performedExercises = workoutSession.exercises.filter(
    (sessionExercise) => sessionExercise.skipped === false,
  );

  const exerciseIds = performedExercises.map(
    (sessionExercise) => sessionExercise.exercise,
  );

  if (exerciseIds.length === 0) {
    return 0;
  }

  const exercises = await Exercise.find({
    _id: {
      $in: exerciseIds,
    },
  })
    .select("_id baseXP")
    .session(mongoSession);

  const exerciseXPMap = new Map(
    exercises.map((exercise) => [exercise._id.toString(), exercise.baseXP]),
  );

  let totalXP = 0;

  for (const sessionExercise of performedExercises) {
    const exerciseId = sessionExercise.exercise.toString();

    const baseXP = exerciseXPMap.get(exerciseId);

    if (baseXP === undefined) {
      throw new BadRequestError(
        "Unable to calculate XP because an exercise is unavailable",
      );
    }

    totalXP += baseXP;
  }
  return totalXP;
};

export const calculatePersonalRecordXP = (newPersonalRecords) => {
  const XP_PER_PR = 25;

  const MAX_PR_XP = 75;

  const numberOfPRs = newPersonalRecords.length;

  const calculateXP = numberOfPRs * XP_PER_PR;

  return Math.min(calculateXP, MAX_PR_XP);
};

export const processEchelonRewards = async ({
  userId,
  mongoSession = null,
}) => {
  const awardedEchelons = [];

  let shouldCheckAgain = true;

  while (shouldCheckAgain) {
    shouldCheckAgain = false;

    const user = await User.findById(userId)
      .select("lifetimeXP")
      .session(mongoSession);

    if (!user) {
      throw new NotFoundError("User not found");
    }

    const progression = getProgressFromXP(user.lifetimeXP ?? 0);

    if (progression.echelon === null) {
      break;
    }

    for (let echelon = 1; echelon <= progression.echelon; echelon += 1) {
      const rewardXP = ECHELON_REWARDS[echelon];

      if (rewardXP === undefined) {
        continue;
      }

      const idempotencyKey = `user:${userId}:echelon:${echelon}`;

      const existingReward = await XPTransaction.findOne({ idempotencyKey })
        .select("_id")
        .session(mongoSession);

      if (existingReward) {
        continue;
      }

      await awardXP({
        userId,
        amount: rewardXP,
        sourceType: "echelon",
        sourceId: null,
        idempotencyKey,
        reason: `Reached Echelon ${echelon}`,
        mongoSession,
      });

      awardedEchelons.push({ echelon, xp: rewardXP });

      shouldCheckAgain = true;

      break;
    }
  }
  return awardedEchelons;
};
