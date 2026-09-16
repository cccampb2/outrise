import PersonalRecord from "../models/PersonalRecord.js";
import mongoose from "mongoose";

export const getPRCandidate = (sessionExercise) => {
  const measurementType = sessionExercise.measurementType;

  const actual = sessionExercise.actual;

  if (sessionExercise.skipped) {
    return null;
  }

  if (measurementType === "weight_reps") {
    const weightedSets = actual.sets.filter(
      (set) => set.weightLbs !== undefined,
    );
    if (weightedSets.length === 0) {
      return null;
    }
    const heaviestSet = actual.sets.reduce((currentHeaviest, currentSet) => {
      if (currentSet.weightLbs > currentHeaviest.weightLbs) {
        return currentSet;
      }
      return currentHeaviest;
    });

    return {
      recordType: "max_weight",

      value: heaviestSet.weightLbs,

      distanceMiles: null,
    };
  }

  if (measurementType === "reps") {
    const highestRepSet = actual.sets.reduce((currentHighest, currentSet) => {
      if (currentSet.reps > currentHighest.reps) {
        return currentSet;
      }
      return currentHighest;
    });

    return {
      recordType: "max_reps",
      value: highestRepSet.reps,
      distanceMiles: null,
    };
  }
  if (measurementType === "time") {
    return {
      recordType: "fastest_time",
      value: actual.timeSeconds,
      distanceMiles: null,
    };
  }

  if (measurementType === "distance_time") {
    return {
      recordType: "fastest_distance_time",
      value: actual.timeSeconds,
      distanceMiles: actual.distanceMiles,
    };
  }

  if (measurementType === "duration") {
    return {
      recordType: "longest_duration",
      value: actual.timeSeconds,
      distanceMiles: null,
    };
  }

  return null;
};

export const isBetterPR = ({ recordType, candidateValue, currentValue }) => {
  if (recordType === "max_weight") {
    return candidateValue > currentValue;
  }

  if (recordType === "max_reps") {
    return candidateValue > candidateValue;
  }

  if (recordType === "fastest_time") {
    return candidateValue < currentValue;
  }

  if (recordType === "fastest_distance_time") {
    return candidateValue < currentValue;
  }

  if (recordType === "longest_duration") {
    return candidateValue > currentValue;
  }

  return false;
};

export const processPRCandidate = async ({
  userId,
  exerciseId,
  workoutSessionId,
  achievedAt,
  candidate,
  mongoSession,
}) => {
  const query = {
    user: userId,
    exercise: exerciseId,
    recordType: candidate.recordType,
  };

  if (candidate.recordType === "fastest_distance_time") {
    query.distanceMiles = candidate.distanceMiles;
  }

  const currentPR = await PersonalRecord.findOne(query)
    .sort({
      achievedAt: -1,
    })
    .session(mongoSession);

  if (!currentPR) {
    const newPR = new PersonalRecord({
      user: userId,
      exercise: exerciseId,
      recordType: candidate.recordType,
      value: candidate.value,
      distanceMiles: candidate.distanceMiles,
      workoutSession: workoutSessionId,
      achievedAt,
    });

    await newPR.save({ session: mongoSession });
    return newPR;
  }

  const candidateIsBetter = isBetterPR({
    recordType: candidate.recordType,
    candidateValue: candidate.value,
    currentValue: currentPR.value,
  });

  if (!candidateIsBetter) {
    return null;
  }

  const newPR = new PersonalRecord({
    user: userId,
    exercise: exerciseId,
    recordType: candidate.recordType,
    value: candidate.value,
    distanceMiles: candidate.distanceMiles,
    workoutSession: workoutSessionId,
    achievedAt,
  });
  await newPR.save({ session: mongoSession });

  return newPR;
};

export const processWorkoutSessionPRs = async ({
  workoutSession,
  mongoSession,
}) => {
  const newPersonalRecords = [];

  for (const sessionExercise of workoutSession.exercises) {
    const candidate = getPRCandidate(sessionExercise);

    if (!candidate) {
      continue;
    }

    const newPersonalRecord = await processPRCandidate({
      userId: workoutSession.user,
      exerciseId: sessionExercise.exercise,
      workoutSessionId: workoutSession._id,
      achievedAt: workoutSession.completedAt,
      candidate,
      mongoSession,
    });

    if (!newPersonalRecord) {
      continue;
    }
    newPersonalRecords.push(newPersonalRecord);
  }
  return newPersonalRecords;
};

export const getCurrentPersonalRecords = async ({ userId }) => {
  const personalRecords = await PersonalRecord.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(userId) } },
    { $sort: { achievedAt: -1 } },
    {
      $group: {
        _id: {
          exercise: "$exercise",
          recordType: "$recordType",
          distanceMiles: "$distanceMiles",
        },
        personalRecords: { $first: "$$ROOT" },
      },
    },
    { $replaceRoot: { newRoot: "$personalRecords" } },
    { $sort: { achievedAt: -1 } },
  ]);

  return personalRecords;
};

export const getPersonalRecordHistory = async ({
  userId,
  exerciseId,
  page,
  limit,
  distanceMiles,
}) => {
  const query = { user: userId, exercise: exerciseId };

  if (distanceMiles !== undefined) {
    query.distanceMiles = distanceMiles;
  }

  const skip = (page - 1) * limit;

  const personalRecords = await PersonalRecord.find(query)
    .sort({ achievedAt: 1 })
    .skip(skip)
    .limit(limit);

  const totalPersonalRecords = await PersonalRecord.countDocuments(query);

  const totalPages = Math.ceil(totalPersonalRecords / limit);

  return {
    personalRecords,
    pagination: { page, limit, totalPersonalRecords, totalPages },
  };
};
