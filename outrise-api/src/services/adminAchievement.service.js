import Achievement from "../models/Achievement.js";
import Exercise from "../models/Exercise.js";
import BadRequestError from "../errors/BadRequestError.js";
import NotFoundError from "../errors/NotFoundError.js";
import {
  RUNNING_PR_DISTANCES,
  STRENGTH_PR_REPS,
} from "./personalRecord.service.js";

async function validateRequirements(data) {
  const { requirementType: type, requirement: rule } = data;
  const { value, exercise, recordCategory, operator } = rule;
  if (type === "workout_time_of_day") {
    if (
      !Number.isInteger(value) ||
      value < 0 ||
      value > 23 ||
      !["before", "after"].includes(operator)
    ) {
      throw new BadRequestError(
        "Choose a whole hour from 0 to 23 and before or after",
      );
    }
  } else if (type === "verified_performance") {
    if (!exercise || value <= 0) {
      throw new BadRequestError(
        "Choose an exercise and a positive performance target",
      );
    }
    const selected =
      await Exercise.findById(exercise).select("measurementType");
    if (!selected) {
      throw new BadRequestError("Exercise not found");
    }
    const measurement = selected.measurementType;
    if (
      !["weight_reps", "reps", "time", "duration", "distance_time"].includes(
        measurement,
      )
    ) {
      throw new BadRequestError(
        "This exercise does not support verified performance achievements",
      );
    }
    if (measurement === "reps" && !Number.isInteger(value)) {
      throw new BadRequestError("Reps must be a whole number");
    }
    let categories = [];
    if (measurement === "weight_reps") {
      categories = [...STRENGTH_PR_REPS].map((reps) => `${reps}RM`);
    } else if (measurement === "distance_time") {
      categories = RUNNING_PR_DISTANCES.map((distance) => distance.category);
    }
    if (recordCategory && !categories.includes(recordCategory)) {
      throw new BadRequestError("Record category does not match the exercise");
    }
    if (measurement === "distance_time" && !recordCategory) {
      throw new BadRequestError(
        "Choose a running distance for this achievement",
      );
    }
  } else if (
    !Number.isInteger(value) ||
    value < 1 ||
    (type === "echelon_reached" && value > 10)
  ) {
    throw new BadRequestError(
      type === "echelon_reached"
        ? "Echelon must be a whole number from 1 to 10"
        : "Target must be a positive whole number",
    );
  }
  if (type !== "verified_performance" && (exercise || recordCategory)) {
    throw new BadRequestError(
      "Exercise and record category only apply to verified performance",
    );
  }
  if (type !== "workout_time_of_day" && operator) {
    throw new BadRequestError(
      "Before/after only applies to workout time of day",
    );
  }
}

export const listAdminAchievements = async ({
  page,
  limit,
  search,
  status,
}) => {
  const filter = {};
  if (status !== "all") {
    filter.isActive = status === "active";
  }
  if (search) {
    filter.name = {
      $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      $options: "i",
    };
  }
  const [achievements, total] = await Promise.all([
    Achievement.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Achievement.countDocuments(filter),
  ]);
  return {
    achievements,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const getAdminAchievement = async (id) => {
  const achievement = await Achievement.findById(id);
  if (!achievement) {
    throw new NotFoundError("Achievement not found");
  }
  return achievement;
};

export const createAdminAchievement = async (data) => {
  await validateRequirements(data);
  const achievement = new Achievement(data);
  await achievement.save();
  return achievement;
};

export const updateAdminAchievement = async (id, data) => {
  const achievement = await getAdminAchievement(id);
  await validateRequirements(data);
  achievement.set(data);
  // Document save runs the model's slug and requirement validation hooks.
  await achievement.save();
  return achievement;
};

export const setAchievementStatus = async (id, isActive) => {
  const achievement = await getAdminAchievement(id);
  achievement.isActive = isActive;
  await achievement.save();
  return achievement;
};
