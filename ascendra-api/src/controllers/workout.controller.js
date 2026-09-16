import {
  createWorkout,
  getMyWorkouts,
  getWorkoutById,
  updateWorkout,
  restoreWorkout,
  archiveWorkout,
  duplicateWorkout,
} from "../services/workout.service.js";

export const createWorkoutController = async (req, res, next) => {
  try {
    const ownerId = req.user.userId;

    const { name, description, exercises, visibility } = req.body;

    const workout = await createWorkout({
      ownerId,
      name,
      description,
      exercises,
      visibility,
    });

    return res.status(201).json({
      message: "Workout created successfully",
      workout,
    });
  } catch (error) {
    next(error);
  }
};

export const getMyWorkoutsController = async (req, res, next) => {
  try {
    const ownerId = req.user.userId;

    const { page, limit, status } = req.query;

    const result = await getMyWorkouts({ ownerId, page, limit, status });

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getWorkoutByIdController = async (req, res, next) => {
  try {
    const workoutId = req.params.id;

    const ownerId = req.user.userId;

    const workout = await getWorkoutById({ workoutId, ownerId });

    return res.status(200).json({ workout });
  } catch (error) {
    next(error);
  }
};

export const updateWorkoutController = async (req, res, next) => {
  try {
    const workoutId = req.params.id;
    const ownerId = req.user.userId;
    const updates = req.body;
    const workout = await updateWorkout({ workoutId, ownerId, updates });

    return res
      .status(200)
      .json({ message: "Workout updated successfully", workout });
  } catch (error) {
    next(error);
  }
};

export const archiveWorkoutController = async (req, res, next) => {
  try {
    const workoutId = req.params.id;
    const ownerId = req.user.userId;

    const workout = await archiveWorkout({ workoutId, ownerId });

    return res
      .status(200)
      .json({ message: "Workout archived successfully", workout });
  } catch (error) {
    next(error);
  }
};

export const restoreWorkoutController = async (req, res, next) => {
  try {
    const workoutId = req.params.id;
    const ownerId = req.user.userId;

    const workout = await restoreWorkout({ workoutId, ownerId });

    return res
      .status(200)
      .json({ message: "Workout restored successfully", workout });
  } catch (error) {
    next(error);
  }
};

export const duplicateWorkoutController = async (req, res, next) => {
  try {
    const workoutId = req.params.id;

    const ownerId = req.user.userId;

    const workout = await duplicateWorkout({ workoutId, ownerId });

    return res.status(201).json({
      message: "Workout duplicated successfully",
      workout,
    });
  } catch (error) {
    next(error);
  }
};
