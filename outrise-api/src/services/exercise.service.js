import Exercise from "../models/Exercise.js";
import ConflictError from "../errors/ConflictError.js";
import NotFoundError from "../errors/NotFoundError.js";
import ForbiddenError from "../errors/ForbiddenError.js";
import { hasAdminAccess } from "../constants/userRoles.js";

export const createExercise = async ({
  name,
  slug,
  description,
  category,
  muscleGroups,
  equipment,
  instructions,
  videoUrl,
  measurementType,
  baseXP,
  isActive,
}) => {
  const normalizedName = name
    .trim()
    .toLowerCase()
    .replace(/[\s-_]/g, "");

  const existingExercise = await Exercise.findOne({
    $or: [{ normalizedName }, { slug }],
  });

  if (existingExercise) {
    throw new ConflictError("An exercise with this name already exists");
  }

  const exercise = await Exercise.create({
    name,
    normalizedName,
    slug,
    description,
    category,
    muscleGroups,
    equipment,
    instructions,
    videoUrl,
    measurementType,
    baseXP,
    isActive,
  });

  return exercise;
};

export const getExercises = async ({
  page,
  limit,
  category,
  muscleGroup,
  equipment,
  search,
  status = "active",
  userRole,
}) => {
  const requiresAdmin = status === "archived" || status === "all";

  if (requiresAdmin && !hasAdminAccess(userRole)) {
    throw new ForbiddenError(
      "You do not have permission to view archived exercises",
    );
  }
  const filter = {};

  if (status === "active") {
    filter.isActive = true;
  }

  if (status === "archived") {
    filter.isActive = false;
  }

  if (category) {
    filter.category = category;
  }

  if (muscleGroup) {
    filter.muscleGroups = muscleGroup;
  }

  if (equipment) {
    filter.equipment = equipment;
  }

  if (search) {
    filter.name = {
      $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      $options: "i",
    };
  }

  const skip = (page - 1) * limit;

  const query = Exercise.find(filter).sort({ name: 1 }).skip(skip).limit(limit);
  if (hasAdminAccess(userRole)) {
    query.select("+baseXP");
  }
  const exercises = await query;

  const totalExercises = await Exercise.countDocuments(filter);

  const totalPages = Math.ceil(totalExercises / limit);

  return {
    exercises,
    pagination: {
      page,
      limit,
      totalExercises,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
};

export const getExerciseBySlug = async (slug) => {
  const exercise = await Exercise.findOne({ slug, isActive: true });

  if (!exercise) {
    throw new NotFoundError("Exercise not found");
  }

  return exercise;
};

export const updateExercise = async ({ exerciseId, updates = {} }) => {
  if (updates.name) {
    updates.normalizedName = updates.name
      .trim()
      .toLowerCase()
      .replace(/[\s-_]/g, "");
  }
  if (updates.name || updates.slug) {
    const duplicateConditions = [];

    if (updates.name) {
      duplicateConditions.push({ normalizedName: updates.normalizedName });
    }

    if (updates.slug) {
      duplicateConditions.push({ slug: updates.slug });
    }

    const existingExercise = await Exercise.findOne({
      $or: duplicateConditions,
      _id: { $ne: exerciseId },
    });
    if (existingExercise) {
      throw new ConflictError("An exercise with this name already exists");
    }
  }

  const exercise = await Exercise.findByIdAndUpdate(
    exerciseId,
    { $set: updates },
    { returnDocument: "after", runValidators: true },
  );

  if (!exercise) {
    throw new NotFoundError("Exercise not found");
  }

  return exercise;
};

export const archiveExercise = async (exerciseId) => {
  const exercise = await Exercise.findByIdAndUpdate(
    exerciseId,
    {
      $set: { isActive: false },
    },
    { returnDocument: "after", runValidators: true },
  );
  if (!exercise) {
    throw new NotFoundError("Exercise not found");
  }

  return exercise;
};

export const restoreExercise = async (exerciseId) => {
  const exercise = await Exercise.findByIdAndUpdate(
    exerciseId,
    {
      $set: { isActive: true },
    },
    { returnDocument: "after", runValidators: true },
  );
  if (!exercise) {
    throw new NotFoundError("Exercise not found");
  }

  return exercise;
};

export const getExerciseById = async ({ exerciseId, userRole }) => {
  const query = Exercise.findOne({ _id: exerciseId, isActive: true });
  if (hasAdminAccess(userRole)) {
    query.select("+baseXP");
  }
  const exercise = await query;

  if (!exercise) {
    throw new NotFoundError("Exercise not found");
  }

  return exercise;
};

export const getExerciseMuscleGroups = async () => {
  const muscleGroups = await Exercise.distinct("muscleGroups", {
    isActive: true,
  });

  return muscleGroups.sort((a, b) => a.localeCompare(b));
};
