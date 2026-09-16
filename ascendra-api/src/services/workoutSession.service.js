import WorkoutSession from "../models/WorkoutSession.js";
import User from "../models/User.js";
import Workout from "../models/Workout.js";
import NotFoundError from "../errors/NotFoundError.js";
import ConflictError from "../errors/ConflictError.js";
import BadRequestError from "../errors/BadRequestError.js";
import mongoose from "mongoose";
import { processWorkoutSessionPRs } from "./personalRecord.service.js";
import WorkoutOfTheWeekOccurrence from "../models/WorkoutOfTheWeekOccurrence.js";
import {
  awardXP,
  calculateWorkoutXP,
  calculatePersonalRecordXP,
  processEchelonRewards,
} from "./xp.service.js";

export const startWorkoutSession = async ({ userId, workoutId }) => {
  await ensureNoActiveSession({ userId });

  const workout = await Workout.findOne({
    _id: workoutId,
    owner: userId,
    isActive: true,
  }).populate("exercises.exercise", "name measurementType");

  if (!workout) {
    throw new NotFoundError("Workout not found");
  }

  const sessionExercises = buildSessionExercisesFromWorkout(workout);

  const workoutSession = await WorkoutSession.create({
    user: userId,
    workout: workoutId,
    workoutName: workout.name,
    exercises: sessionExercises,
    status: "active",
    sourceType: "workout",
  });

  return workoutSession;
};

export const startWorkoutOfTheWeekSession = async ({ userId }) => {
  await ensureNoActiveSession({ userId });

  const occurrence = await WorkoutOfTheWeekOccurrence.findOne({
    status: "active",
  });

  if (!occurrence) {
    throw new NotFoundError("No active Workout of the Week found");
  }

  const existingAttempt = await WorkoutSession.findOne({
    user: userId,
    workoutOfTheWeekOccurrence: occurrence._id,
    sourceType: "workout_of_the_week",
  });

  if (existingAttempt) {
    throw new ConflictError(
      "You have already attempted this Workout of the Week",
    );
  }

  const sessionExercises = occurrence.exercises.map((occurrenceExercise) => {
    return {
      exercise: occurrenceExercise.exercise,
      exerciseName: occurrenceExercise.exerciseName,
      measurementType: occurrenceExercise.measurementType,
      order: occurrenceExercise.order,
      target: occurrenceExercise.target.toObject(),
    };
  });

  const workoutSession = await WorkoutSession.create({
    user: userId,
    sourceType: "workout_of_the_week",
    workoutOfTheWeekOccurrence: occurrence._id,
    workoutName: occurrence.name,
    exercises: sessionExercises,
    status: "active",
  });

  return workoutSession;
};

export const repeatWorkoutSession = async ({ userId, sessionId }) => {
  await ensureNoActiveSession({ userId });

  const historicalSession = await WorkoutSession.findOne({
    _id: sessionId,
    user: userId,
    status: {
      $in: ["completed", "cancelled"],
    },
  });

  if (!historicalSession) {
    throw new NotFoundError("Workout session not found");
  }

  const sessionExercises = historicalSession.exercises.map(
    (historicalExercise) => {
      return {
        exercise: historicalExercise.exercise,
        exerciseName: historicalExercise.exerciseName,
        measurementType: historicalExercise.measurementType,
        order: historicalExercise.order,
        target: historicalExercise.target.toObject(),
      };
    },
  );

  const workoutSession = await WorkoutSession.create({
    user: userId,
    workout: historicalSession.workout,
    workoutName: historicalSession.workoutName,
    workoutOfTheWeekOccurrence: historicalSession.workoutOfTheWeekOccurrence,
    exercises: sessionExercises,
    status: "active",
    sourceType: "repeat",
  });

  return workoutSession;
};

export const getActiveWorkoutSession = async ({ userId }) => {
  const workoutSession = await WorkoutSession.findOne({
    user: userId,
    status: "active",
  });

  return workoutSession;
};

export const updateSessionExercise = async ({
  userId,
  exerciseOrder,
  actual,
}) => {
  const workoutSession = await WorkoutSession.findOne({
    user: userId,
    status: "active",
  });

  if (!workoutSession) {
    throw new NotFoundError("Active workout session not found");
  }

  const sessionExercise = workoutSession.exercises.find(
    (exercise) => exercise.order === exerciseOrder,
  );

  if (!sessionExercise) {
    throw new NotFoundError("Exercise not found in active workout session");
  }

  const measurementType = sessionExercise.measurementType;

  if (measurementType === "weight_reps") {
    if (!actual.sets) {
      throw new BadRequestError("Sets are required for this exercise");
    }
    if (
      actual.distanceMiles !== undefined ||
      actual.timeSeconds !== undefined
    ) {
      throw new BadRequestError("This exericse only accepts set perfomance");
    }
    actual.sets.forEach((set) => {
      if (set.reps === undefined) {
        throw new BadRequestError("Reps are required for every set");
      }
    });
  }

  if (measurementType === "reps") {
    if (!actual.sets) {
      throw new BadRequestError("Sets are required for this exercise");
    }

    if (
      actual.distanceMiles !== undefined ||
      actual.timeSeconds !== undefined
    ) {
      throw new BadRequestError("This exercise only accepts set performance");
    }

    actual.sets.forEach((set) => {
      if (set.reps === undefined) {
        throw new BadRequestError("Reps are required for every set");
      }

      if (set.weightLbs !== undefined) {
        throw new BadRequestError("Weight is not allowed for this exercise");
      }
    });
  }

  if (measurementType === "time") {
    if (actual.timeSeconds === undefined) {
      throw new BadRequestError("Time is required for this exercise");
    }

    if (actual.sets !== undefined || actual.distanceMiles !== undefined) {
      throw new BadRequestError("This exercise only accepts time");
    }
  }

  if (measurementType === "distance_time") {
    if (actual.distanceMiles === undefined) {
      throw new BadRequestError("Distance is required for this exercise");
    }

    if (actual.timeSeconds === undefined) {
      throw new BadRequestError("Time is required for this exercise");
    }

    if (actual.sets !== undefined) {
      throw new BadRequestError("Sets are not allowed for this exercise");
    }
  }

  if (measurementType === "duration") {
    if (actual.timeSeconds === undefined) {
      throw new BadRequestError("Duration is required for this exercise");
    }

    if (actual.sets !== undefined || actual.distanceMiles !== undefined) {
      throw new BadRequestError("This exercise only accepts duration");
    }
  }

  if (actual.sets) {
    const setOrders = actual.sets.map((set) => set.order);
    const sortedSetOrders = [...setOrders].sort((a, b) => a - b);

    const hasInvalidSetOrder = sortedSetOrders.some(
      (order, index) => order !== index,
    );

    if (hasInvalidSetOrder) {
      throw new BadRequestError(
        "Set order must start at 0 and contain no duplicates or gaps",
      );
    }
  }
  sessionExercise.skipped = false;
  sessionExercise.actual = actual;
  await workoutSession.save();

  return workoutSession;
};

export const cancelActiveWorkouSession = async ({ userId }) => {
  const workoutSession = await WorkoutSession.findOne({
    user: userId,
    status: "active",
  });

  if (!workoutSession) {
    throw new NotFoundError("Active workout session not found");
  }

  workoutSession.status = "cancelled";

  workoutSession.cancelledAt = new Date();

  await workoutSession.save();
  return workoutSession;
};

export const hasValidActualPerformance = (sessionExercise) => {
  const measurementType = sessionExercise.measurementType;

  const actual = sessionExercise.actual;

  if (measurementType === "weight_reps") {
    if (!actual.sets || actual.sets.length === 0) {
      return false;
    }

    return actual.sets.every((set) => set.reps !== undefined && set.reps > 0);
  }

  if (measurementType === "reps") {
    if (!actual.sets || actual.sets.length === 0) {
      return false;
    }

    return actual.sets.every((set) => set.reps !== undefined && set.reps > 0);
  }

  if (measurementType === "time") {
    return actual.timeSeconds !== undefined && actual.timeSeconds > 0;
  }

  if (measurementType === "distance_time") {
    return (
      actual.distanceMiles !== undefined &&
      actual.distanceMiles > 0 &&
      actual.timeSeconds !== undefined &&
      actual.timeSeconds > 0
    );
  }

  if (measurementType === "duration") {
    return actual.timeSeconds !== undefined && actual.timeSeconds > 0;
  }

  return false;
};

export const completeActiveWorkoutSession = async ({ userId }) => {
  const mongoSession = await mongoose.startSession();
  mongoSession.startTransaction();
  try {
    const workoutSession = await WorkoutSession.findOne({
      user: userId,
      status: "active",
    }).session(mongoSession);

    if (!workoutSession) {
      throw new NotFoundError("Active workout session not found");
    }

    const incompleteExercise = workoutSession.exercises.find(
      (sessionExercise) => {
        if (sessionExercise.skipped) {
          return false;
        }
        const hasValidPerformance = hasValidActualPerformance(sessionExercise);

        return !hasValidPerformance;
      },
    );

    if (incompleteExercise) {
      throw new BadRequestError(
        `${incompleteExercise.exerciseName} must be completed or skipped before finishing the workout`,
      );
    }

    const completedAt = new Date();

    const durationMilliseconds =
      completedAt.getTime() - workoutSession.startedAt.getTime();

    const durationSeconds = Math.floor(durationMilliseconds / 1000);

    workoutSession.status = "completed";

    workoutSession.completedAt = completedAt;

    workoutSession.durationSeconds = durationSeconds;

    await workoutSession.save({ session: mongoSession });

    await User.findByIdAndUpdate(
      workoutSession.user,
      { $inc: { totalWorkouts: 1 } },
      { session: mongoSession, runValidators: true },
    );

    const newPersonalRecords = await processWorkoutSessionPRs({
      workoutSession,
      mongoSession,
    });

    const workoutXP = await calculateWorkoutXP({
      workoutSession,
      mongoSession,
    });

    const personalRecordXP = calculatePersonalRecordXP(newPersonalRecords);

    let workoutOfTheWeekXP = 0;

    if (workoutSession.workoutOfTheWeekOccurrence) {
      const occurrence = await WorkoutOfTheWeekOccurrence.findById(
        workoutSession.workoutOfTheWeekOccurrence,
      ).session(mongoSession);

      if (!occurrence) {
        throw new NotFoundError("Workout of the Week occurrence not found");
      }

      const completedBeforeDeadline = completedAt < occurrence.endsAt;

      if (
        workoutSession.sourceType === "workout_of_the_week" &&
        completedBeforeDeadline
      ) {
        workoutOfTheWeekXP = occurrence.bonusXP;
      }
    }

    if (workoutXP > 0) {
      await awardXP({
        userId: workoutSession.user,
        amount: workoutXP,
        sourceType: "workout_completion",
        sourceId: workoutSession._id,
        reason: "Completed Workout",
        mongoSession,
        idempotencyKey: `workout:${workoutSession._id}:completion`,
      });
    }

    if (personalRecordXP > 0) {
      await awardXP({
        userId: workoutSession.user,
        amount: personalRecordXP,
        sourceType: "personal_record",
        sourceId: workoutSession._id,
        reason: "Earned new personal record bonus",
        mongoSession,
        idempotencyKey: `workout:${workoutSession._id}:pr-bonus`,
      });
    }

    if (workoutOfTheWeekXP > 0) {
      await awardXP({
        userId,

        amount: workoutOfTheWeekXP,

        sourceType: "workout_of_the_week",

        sourceId: workoutSession.workoutOfTheWeekOccurrence,

        reason: "Workout of the Week bonus",

        idempotencyKey: `wotw:${userId}:${workoutSession.workoutOfTheWeekOccurrence}:bonus`,

        mongoSession,
      });
    }

    const echelonRewards = await processEchelonRewards({
      userId: workoutSession.user,
      mongoSession,
    });

    const echelonXP = echelonRewards.reduce(
      (total, reward) => total + reward.xp,
      0,
    );

    await mongoSession.commitTransaction();

    return {
      workoutSession,
      newPersonalRecords,
      echelonRewards,
      xpEarned: {
        workout: workoutXP,
        personalRecords: personalRecordXP,
        echelons: echelonXP,
        workoutOfTheWeek: workoutOfTheWeekXP,
        total: workoutXP + personalRecordXP + echelonXP + workoutOfTheWeekXP,
      },
    };
  } catch (error) {
    await mongoSession.abortTransaction();
    throw error;
  } finally {
    await mongoSession.endSession();
  }
};

export const updateSessionExerciseSkipped = async ({
  userId,
  exerciseOrder,
  skipped,
}) => {
  const workoutSession = await WorkoutSession.findOne({
    user: userId,
    status: "active",
  });

  if (!workoutSession) {
    throw new NotFoundError("Active workout session not found");
  }

  const sessionExercise = workoutSession.exercises.find(
    (exercise) => exercise.order === exerciseOrder,
  );

  if (!sessionExercise) {
    throw new NotFoundError("Exercise not found in active workout session");
  }

  if (skipped) {
    sessionExercise.actual = {};
  }

  sessionExercise.skipped = skipped;
  await workoutSession.save();
  return workoutSession;
};

export const getWorkoutSessionHistory = async ({
  userId,
  status,
  page,
  limit,
}) => {
  const query = {
    user: userId,
    status: { $in: ["completed", "cancelled"] },
  };

  if (status) {
    query.status = status;
  }

  const skip = (page - 1) * limit;

  const workoutSessions = await WorkoutSession.find(query)
    .sort({
      startedAt: -1,
    })
    .skip(skip)
    .limit(limit);

  const totalWorkoutSessions = await WorkoutSession.countDocuments(query);

  const totalPages = Math.ceil(totalWorkoutSessions / limit);

  return {
    workoutSessions,
    pagination: { page, limit, totalWorkoutSessions, totalPages },
  };
};

export const getWorkoutSessionById = async ({ userId, sessionId }) => {
  const workoutSession = await WorkoutSession.findOne({
    _id: sessionId,
    user: userId,
  });

  if (!workoutSession) {
    throw new NotFoundError("Workout session not found");
  }

  return workoutSession;
};

const ensureNoActiveSession = async ({ userId }) => {
  const existingActiveSession = await WorkoutSession.findOne({
    user: userId,
    status: "active",
  });

  if (existingActiveSession) {
    throw new ConflictError("You already have an active workout session");
  }
};

const buildSessionExercisesFromWorkout = (workout) => {
  return workout.exercises.map((workoutExercise) => {
    return {
      exercise: workoutExercise.exercise._id,
      exerciseName: workoutExercise.exercise.name,
      measurementType: workoutExercise.exercise.measurementType,
      order: workoutExercise.order,
      target: {
        ...(workoutExercise.target.sets !== undefined && {
          sets: workoutExercise.target.sets,
        }),
        ...(workoutExercise.target.reps !== undefined && {
          reps: workoutExercise.target.reps,
        }),
        ...(workoutExercise.target.weightLbs !== undefined && {
          weightLbs: workoutExercise.target.weightLbs,
        }),
        ...(workoutExercise.target.distanceMiles !== undefined && {
          distanceMiles: workoutExercise.target.distanceMiles,
        }),
        ...(workoutExercise.target.timeSeconds !== undefined && {
          timeSeconds: workoutExercise.target.timeSeconds,
        }),
      },
    };
  });
};
