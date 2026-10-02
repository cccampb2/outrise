import Verification from "../models/Verification.js";
import { recordVerificationActivity } from "./verificationActivity.service.js";
import Exercise from "../models/Exercise.js";
import NotFoundError from "../errors/NotFoundError.js";
import BadRequestError from "../errors/BadRequestError.js";
import ConflictError from "../errors/ConflictError.js";
import ForbiddenError from "../errors/ForbiddenError.js";
import {
  processPRCandidate,
  STRENGTH_PR_REPS,
  RUNNING_PR_DISTANCES,
  DISTANCE_TOLERANCE_MILES,
} from "./personalRecord.service.js";

import { processProgressionAchievements } from "./progression.service.js";
import {
  uploadVerificationVideo,
  deleteVerificationVideo,
} from "./media.service.js";
import mongoose from "mongoose";
import {
  checkPersonalRecordCountAchievements,
  checkVerificationCountAchievements,
  checkVerifiedPerformanceAchievements,
} from "./achievement.service.js";

const hasValue = (value) => value !== undefined && value !== null;

const validateVerificationPerformance = (measurementType, performance) => {
  const { reps, weightLbs, distanceMiles, timeSeconds } = performance;

  if (measurementType === "weight_reps") {
    if (reps === undefined || weightLbs === undefined) {
      throw new BadRequestError(
        "Weight and reps are required for this verification",
      );
    }
    if (hasValue(distanceMiles) || hasValue(timeSeconds)) {
      throw new BadRequestError(
        "Distance and time are not valid for this verification.",
      );
    }
    return;
  }

  if (measurementType === "reps") {
    if (reps === undefined) {
      throw new BadRequestError("Reps are required for this verification");
    }
    if (
      hasValue(weightLbs) ||
      hasValue(distanceMiles) ||
      hasValue(timeSeconds)
    ) {
      throw new BadRequestError(
        "Weight, distance, and time are not valid for this verification.",
      );
    }
    return;
  }

  if (measurementType === "time") {
    if (timeSeconds === undefined) {
      throw new BadRequestError("Time is required for this verification");
    }
    if (hasValue(reps) || hasValue(weightLbs) || hasValue(distanceMiles)) {
      throw new BadRequestError(
        "Reps, weight, and distance are not valid for this verification.",
      );
    }
    return;
  }
  if (measurementType === "distance_time") {
    if (distanceMiles === undefined || timeSeconds === undefined) {
      throw new BadRequestError(
        "Distance and time are required for this verification",
      );
    }
    if (hasValue(reps) || hasValue(weightLbs)) {
      throw new BadRequestError(
        "Reps and weight are not valid for this verification.",
      );
    }
    return;
  }

  if (measurementType === "duration") {
    if (timeSeconds === undefined) {
      throw new BadRequestError("Time is required for this verification");
    }
    if (hasValue(reps) || hasValue(weightLbs) || hasValue(distanceMiles)) {
      throw new BadRequestError(
        "Reps, weight, and distance are not valid for this verification.",
      );
    }
    return;
  }

  throw new BadRequestError("Unsupported exercise measurement type");
};

export const createVerification = async ({
  userId,
  exerciseId,
  performance,
  proofFile,
}) => {
  const exercise = await Exercise.findById(exerciseId);

  if (!exercise) {
    throw new NotFoundError("Exercise not found");
  }

  if (!exercise.isActive) {
    throw new BadRequestError(
      "Verification cannot be submitted for an inactive exercise",
    );
  }

  validateVerificationPerformance(exercise.measurementType, performance);

  let uploadedProof = null;

  try {
    uploadedProof = await uploadVerificationVideo(proofFile.buffer);

    const verification = await Verification.create({
      user: userId,
      exercise: exercise._id,
      measurementType: exercise.measurementType,
      performance,
      proof: uploadedProof,
    });

    return verification;
  } catch (error) {
    if (uploadedProof?.publicId) {
      try {
        await deleteVerificationVideo(uploadedProof.publicId);
      } catch {}
    }

    throw error;
  }
};

export const getUserVerificationById = async ({ userId, verificationId }) => {
  const verification = await Verification.findById(verificationId).populate(
    "exercise",
    "name",
  );

  if (!verification) {
    throw new NotFoundError("Verification not found");
  }

  if (verification.user.toString() !== userId.toString()) {
    throw new ForbiddenError(
      "You do not have permission to view this verification",
    );
  }

  return verification;
};

export const getUserVerifications = async ({ userId, status, page, limit }) => {
  const query = {
    user: userId,
  };

  if (status) {
    query.status = status;
  }

  const skip = (page - 1) * limit;

  const verifications = await Verification.find(query)
    .populate("exercise", "name")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalVerifications = await Verification.countDocuments(query);

  return {
    verifications,
    pagination: {
      page,
      limit,
      totalVerifications,
      totalPages: Math.ceil(totalVerifications / limit),
    },
  };
};

export const getAdminVerifications = async ({ status, page, limit }) => {
  const query = {};

  if (status) {
    query.status = status;
  }

  const skip = (page - 1) * limit;

  const verifications = await Verification.find(query)
    .populate("user", "username")
    .populate("exercise", "name measurementType")
    .sort({ createdAt: 1 })
    .skip(skip)
    .limit(limit);

  const totalVerifications = await Verification.countDocuments(query);
  return {
    verifications,
    pagination: {
      page,
      limit,
      totalVerifications,
      totalPages: Math.ceil(totalVerifications / limit),
    },
  };
};

export const getAdminVerificationById = async (verificationId) => {
  const verification = await Verification.findById(verificationId)
    .populate("user", "username")
    .populate("exercise", "name measurementType");

  if (!verification) {
    throw new NotFoundError("Verification not found");
  }
  return verification;
};

export const rejectVerification = async ({
  verificationId,
  adminId,
  rejectionReason,
}) => {
  const mongoSession = await mongoose.startSession();
  try {
    return await mongoSession.withTransaction(async () => {
      const verification = await Verification.findById(verificationId).session(mongoSession);
      if (!verification) throw new NotFoundError("Verification not found");
      if (verification.status !== "pending") throw new ConflictError("Only pending verifications can be rejected");
      verification.status = "rejected";
      verification.reviewedBy = adminId;
      verification.reviewedAt = new Date();
      verification.rejectionReason = rejectionReason;
      await verification.save({ session: mongoSession });
      await recordVerificationActivity(verification, mongoSession);
      return verification;
    });
  } finally { await mongoSession.endSession(); }
};
// TODO: Make the pending-to-approved transition atomic for concurrent admin reviews.
export const approveVerification = async ({ verificationId, adminId }) => {
  const mongoSession = await mongoose.startSession();


  try {
    return await mongoSession.withTransaction(async () => {
    const verification =
      await Verification.findById(verificationId).session(mongoSession);

    if (!verification) {
      throw new NotFoundError("Verification not found");
    }

    if (verification.status !== "pending") {
      throw new ConflictError("Only pending verification can be approved");
    }

    const reviewedAt = new Date();

    verification.status = "approved";
    verification.reviewedBy = adminId;
    verification.reviewedAt = reviewedAt;
    verification.rejectionReason = null;

    await verification.save({ session: mongoSession });

    await recordVerificationActivity(verification, mongoSession);

    const candidate = getVerificationPRCandidate(verification);

    let newPersonalRecord = null;

    if (candidate) {
      newPersonalRecord = await processPRCandidate({
        userId: verification.user,
        exerciseId: verification.exercise,
        sourceType: "verification",
        verificationId: verification._id,
        achievedAt: reviewedAt,
        candidate,
        mongoSession,
      });
    }

    const verificationAchievements = await checkVerificationCountAchievements({
      userId: verification.user,
      verificationId: verification._id,
      mongoSession,
    });

    const verifiedPerformanceAchievements =
      await checkVerifiedPerformanceAchievements({
        verification,
        mongoSession,
      });

    let personalRecordAchievements = [];

    if (newPersonalRecord) {
      personalRecordAchievements = await checkPersonalRecordCountAchievements({
        userId: verification.user,
        personalRecordId: newPersonalRecord._id,
        mongoSession,
      });
    }

    const progressionResult = await processProgressionAchievements({
      userId: verification.user,
      mongoSession,
    });

    const unlockedAchievements = [
      ...verificationAchievements,
      ...verifiedPerformanceAchievements,
      ...personalRecordAchievements,
      ...progressionResult.unlockedAchievements,
    ];

    const achievementUnlocks = unlockedAchievements.map((unlock) => ({
      id: unlock.achievement._id,
      name: unlock.achievement.name,
      description: unlock.achievement.description,
      category: unlock.achievement.category,
      badgeKey: unlock.achievement.badgeKey,
      xpAwarded: unlock.xpResult?.awardedAmount ?? 0,
      unlockedAt: unlock.userAchievement.unlockedAt,
    }));


    return {
      verification,
      newPersonalRecord,
      unlockedAchievements: achievementUnlocks,
      echelonRewards: progressionResult.echelonRewards,
    };
    });
  } finally {
    await mongoSession.endSession();
  }
};

const getVerificationPRCandidate = (verification) => {
  const measurementType = verification.measurementType;

  const performance = verification.performance;

  if (measurementType === "weight_reps") {
    if (!STRENGTH_PR_REPS.has(performance.reps)) {
      return null;
    }
    return {
      recordType: "max_weight",
      recordCategory: `${performance.reps}RM`,
      value: performance.weightLbs,
      distanceMiles: null,
    };
  }

  if (measurementType === "reps") {
    return {
      recordType: "max_reps",
      recordCategory: null,
      value: performance.reps,
      distanceMiles: null,
    };
  }

  if (measurementType === "time") {
    return {
      recordType: "fastest_time",
      recordCategory: null,
      value: performance.timeSeconds,
      distanceMiles: null,
    };
  }

  if (measurementType === "distance_time") {
    const matchedDistance = RUNNING_PR_DISTANCES.find(
      (distance) =>
        Math.abs(performance.distanceMiles - distance.distanceMiles) <=
        DISTANCE_TOLERANCE_MILES,
    );
    if (!matchedDistance) {
      return null;
    }

    return {
      recordType: "fastest_distance_time",
      recordCategory: matchedDistance.category,
      value: performance.timeSeconds,
      distanceMiles: matchedDistance.distanceMiles,
    };
  }

  if (measurementType === "duration") {
    return {
      recordType: "longest_duration",
      recordCategory: null,
      value: performance.timeSeconds,
      distanceMiles: null,
    };
  }

  return null;
};
