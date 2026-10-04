import Workout from "../models/Workout.js";
import Exercise from "../models/Exercise.js";
import BadRequestError from "../errors/BadRequestError.js";
import NotFoundError from "../errors/NotFoundError.js";
import { validateWorkoutTarget } from "../utils/workoutTargetValidation.js";

const validateWorkoutExercises = async (exercises) => {
  const exerciseIds = exercises.map(
    (workoutExercise) => workoutExercise.exercise,
  );

  const exerciseDocuments = await Exercise.find({
    _id: {
      $in: exerciseIds,
    },
    isActive: true,
  });

  const uniqueExerciseIds = new Set(exerciseIds);

  if (exerciseDocuments.length !== uniqueExerciseIds.size) {
    throw new BadRequestError(
      "One or more exercises are invalid or unavailable",
    );
  }

  const exerciseMap = new Map();

  exerciseDocuments.forEach((exerciseDocument) => {
    const exerciseId = exerciseDocument._id.toString();

    exerciseMap.set(exerciseId, exerciseDocument);
  });

  exercises.forEach((workoutExercise) => {
    const exerciseDocument = exerciseMap.get(workoutExercise.exercise);

    validateWorkoutTarget({
      measurementType: exerciseDocument.measurementType,
      target: workoutExercise.target,
      exerciseName: exerciseDocument.name,
    });
  });

  const exerciseOrders = exercises.map(
    (workoutExercise) => workoutExercise.order,
  );

  const sortedExerciseOrders = [...exerciseOrders].sort((a, b) => a - b);

  const hasInvalidOrder = sortedExerciseOrders.some(
    (order, index) => order != index,
  );

  if (hasInvalidOrder) {
    throw new BadRequestError(
      "Exercise order must start at 0 and contain no duplicates or gaps",
    );
  }

  const orderedExercises = [...exercises].sort((a, b) => a.order - b.order);

  return orderedExercises;
};

export const createWorkout = async ({
  ownerId,
  name,
  description,
  exercises,
  visibility,
}) => {
  const orderedExercises = await validateWorkoutExercises(exercises);

  const workout = await Workout.create({
    name,
    description,
    owner: ownerId,
    exercises: orderedExercises,
    visibility,
  });

  return workout;
};

export const getMyWorkouts = async ({
  ownerId,
  page = 1,
  limit = 10,
  status = "active",
  search,
}) => {
  const skip = (page - 1) * limit;

  const isActive = status === "active";

  const filter = {
    owner: ownerId,
    isActive,
  };

  if (search) {
    filter.name = {
      $regex: search,
      $options: "i",
    };
  }

  const workouts = await Workout.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate("exercises.exercise", "name slug category measurementType");

  const totalWorkouts = await Workout.countDocuments(filter);

  const totalPages = Math.ceil(totalWorkouts / limit);

  return {
    workouts,
    pagination: {
      page,
      limit,
      totalWorkouts,
      totalPages,
    },
  };
};

export const getWorkoutById = async ({ workoutId, ownerId }) => {
  const workout = await Workout.findOne({
    _id: workoutId,
    owner: ownerId,
  }).populate(
    "exercises.exercise",
    "name slug description category muscleGroups equipment instructions videoUrl measurementType isActive",
  );

  if (!workout) {
    throw new NotFoundError("Workout not found");
  }

  return workout;
};

export const updateWorkout = async ({ workoutId, ownerId, updates }) => {
  const workout = await Workout.findOne({
    _id: workoutId,
    owner: ownerId,
    isActive: true,
  });

  if (!workout) {
    throw new NotFoundError("Workout not found");
  }

  if (updates.exercises !== undefined) {
    const orderedExercises = await validateWorkoutExercises(updates.exercises);

    updates.exercises = orderedExercises;
  }

  Object.assign(workout, updates);

  await workout.save();

  await workout.populate(
    "exercises.exercise",
    "name slug description category muscleGroups equipment instructions videoUrl measurementType isActive",
  );
  return workout;
};

export const archiveWorkout = async ({ workoutId, ownerId }) => {
  const workout = await Workout.findOne({ _id: workoutId, owner: ownerId });

  if (!workout) {
    throw new NotFoundError("Workout not found");
  }

  if (!workout.isActive) {
    return workout;
  }

  workout.isActive = false;

  await workout.save();

  return workout;
};

export const restoreWorkout = async ({ workoutId, ownerId }) => {
  const workout = await Workout.findOne({ _id: workoutId, owner: ownerId });

  if (!workout) {
    throw new NotFoundError("Workout not found");
  }

  if (workout.isActive) {
    return workout;
  }

  workout.isActive = true;

  await workout.save();

  return workout;
};

export const duplicateWorkout = async ({ workoutId, ownerId }) => {
  const existingWorkout = await Workout.findOne({
    _id: workoutId,
    owner: ownerId,
    isActive: true,
  });

  if (!existingWorkout) {
    throw new NotFoundError("Workout not found");
  }

  const duplicateWorkout = await Workout.create({
    name: `${existingWorkout.name} Copy`,
    description: existingWorkout.description,
    owner: ownerId,
    exercises: existingWorkout.exercises,
    visibility: existingWorkout.visibility,
  });

  await duplicateWorkout.populate(
    "exercises.exercise",
    "name slug description category muscleGroups equipment instructions videoUrl measurementType isActive",
  );

  return duplicateWorkout;
};
