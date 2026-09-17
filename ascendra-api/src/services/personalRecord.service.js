import PersonalRecord from "../models/PersonalRecord.js";
import mongoose from "mongoose";

// Rep counts that Ascendra recognizes as official strength PR categories.
export const STRENGTH_PR_REPS = new Set([1, 3, 5, 8, 10, 12]);

// Official running distances stored in Ascendra's canonical distance unit: miles.
export const RUNNING_PR_DISTANCES = [
  { category: "100m", distanceMiles: 0.0621371 },
  { category: "200m", distanceMiles: 0.124274 },
  { category: "400m", distanceMiles: 0.248548 },
  { category: "800m", distanceMiles: 0.497097 },
  { category: "1_mile", distanceMiles: 1 },
  { category: "1_5_miles", distanceMiles: 1.5 },
  { category: "2_miles", distanceMiles: 2 },
  { category: "5k", distanceMiles: 3.10686 },
  { category: "10k", distanceMiles: 6.21371 },
  { category: "half_marathon", distanceMiles: 13.1094 },
  { category: "marathon", distanceMiles: 26.2188 },
];

// Allows tiny differences when comparing stored distances.
export const DISTANCE_TOLERANCE_MILES = 0.001;

export const getPRCandidate = (sessionExercise) => {
  const measurementType = sessionExercise.measurementType;

  const actual = sessionExercise.actual;

  if (sessionExercise.skipped) {
    return [];
  }

  if (measurementType === "weight_reps") {
    const eligibleSets = actual.sets.filter(
      (set) => STRENGTH_PR_REPS.has(set.reps) && set.weightLbs !== undefined,
    );
    if (eligibleSets.length === 0) {
      return [];
    }

    const bestSetsByReps = new Map();

    for (const set of eligibleSets) {
      const currentBest = bestSetsByReps.get(set.reps);

      if (!currentBest || set.weightLbs > currentBest.weightLbs) {
        bestSetsByReps.set(set.reps, set);
      }
    }

    return [...bestSetsByReps.values()].map((set) => ({
      recordType: "max_weight",
      recordCategory: `${set.reps}RM`,
      value: set.weightLbs,
      distanceMiles: null,
    }));
  }

  if (measurementType === "reps") {
    const highestRepSet = actual.sets.reduce((currentHighest, currentSet) => {
      if (currentSet.reps > currentHighest.reps) {
        return currentSet;
      }
      return currentHighest;
    });

    return [
      {
        recordType: "max_reps",
        recordCategory: null,
        value: highestRepSet.reps,
        distanceMiles: null,
      },
    ];
  }
  if (measurementType === "time") {
    return [
      {
        recordType: "fastest_time",
        recordCategory: null,
        value: actual.timeSeconds,
        distanceMiles: null,
      },
    ];
  }

  if (measurementType === "distance_time") {
    const matchedDistance = RUNNING_PR_DISTANCES.find(
      (distance) =>
        Math.abs(actual.distanceMiles - distance.distanceMiles) <=
        DISTANCE_TOLERANCE_MILES,
    );

    if (!matchedDistance) {
      return [];
    }

    return [
      {
        recordType: "fastest_distance_time",
        recordCategory: matchedDistance.category,
        value: actual.timeSeconds,
        distanceMiles: matchedDistance.distanceMiles,
      },
    ];
  }

  if (measurementType === "duration") {
    return [
      {
        recordType: "longest_duration",
        recordCategory: null,
        value: actual.timeSeconds,
        distanceMiles: null,
      },
    ];
  }

  return [];
};

export const isBetterPR = ({ recordType, candidateValue, currentValue }) => {
  if (recordType === "max_weight") {
    return candidateValue > currentValue;
  }

  if (recordType === "max_reps") {
    return candidateValue > currentValue;
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
  workoutSessionId = null,
  verificationId = null,
  achievedAt,
  candidate,
  sourceType,
  mongoSession = null,
}) => {
  if (
    (sourceType === "workout" && !workoutSessionId) ||
    (sourceType === "verification" && !verificationId) ||
    !["workout", "verification"].includes(sourceType)
  ) {
    throw new Error("Invalid personal record source.");
  }

  const query = {
    user: userId,
    exercise: exerciseId,
    recordType: candidate.recordType,
    recordCategory: candidate.recordCategory,
  };

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
      workoutSession: sourceType === "workout" ? workoutSessionId : null,
      verification: sourceType === "verification" ? verificationId : null,
      achievedAt,
      recordCategory: candidate.recordCategory,
      sourceType,
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
    recordCategory: candidate.recordCategory,
    sourceType,
    workoutSession: sourceType === "workout" ? workoutSessionId : null,
    verification: sourceType === "verification" ? verificationId : null,
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
    const candidates = getPRCandidate(sessionExercise);

    for (const candidate of candidates) {
      const newPersonalRecord = await processPRCandidate({
        userId: workoutSession.user,
        exerciseId: sessionExercise.exercise,
        workoutSessionId: workoutSession._id,
        achievedAt: workoutSession.completedAt,
        candidate,
        mongoSession,
        sourceType: "workout",
      });
      if (!newPersonalRecord) {
        continue;
      }
      newPersonalRecords.push(newPersonalRecord);
    }
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
          recordCategory: "$recordCategory",
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
  recordCategory,
}) => {
  const query = { user: userId, exercise: exerciseId };

  if (recordCategory !== undefined) {
    query.recordCategory = recordCategory;
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
