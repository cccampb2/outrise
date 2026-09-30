import {
  createExercise,
  getExercises,
  getExerciseBySlug,
  updateExercise,
  archiveExercise,
  restoreExercise,
  getExerciseById,
  getExerciseMuscleGroups,
} from "../services/exercise.service.js";

export const createExerciseController = async (req, res, next) => {
  try {
    const {
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
    } = req.body;

    const exercise = await createExercise({
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
    });

    res.status(201).json({
      message: "Exercise created successfully",
      exercise,
    });
  } catch (error) {
    next(error);
  }
};

export const getExercisesController = async (req, res, next) => {
  try {
    const { page, limit, category, muscleGroup, equipment, search, status } =
      req.query;

    const result = await getExercises({
      page,
      limit,
      category,
      muscleGroup,
      equipment,
      search,
      status,
      userRole: req.user.role,
    });

    res
      .status(200)
      .json({ exercises: result.exercises, pagination: result.pagination });
  } catch (error) {
    next(error);
  }
};

export const gerExerciseBySlugController = async (req, res, next) => {
  try {
    const { slug } = req.params;

    const exercise = await getExerciseBySlug(slug);

    res.status(200).json({
      exercise,
    });
  } catch (error) {
    next(error);
  }
};

export const updateExerciseController = async (req, res, next) => {
  try {
    const { id } = req.params;

    const updates = req.body;

    const exercise = await updateExercise({
      exerciseId: id,
      updates,
    });

    res.status(200).json({
      message: "Exercise updated successfully",
      exercise,
    });
  } catch (error) {
    next(error);
  }
};

export const archiveExerciseController = async (req, res, next) => {
  try {
    const { id } = req.params;

    const exercise = await archiveExercise(id);

    res.status(200).json({
      message: "Exercise archived successfully",
      exercise,
    });
  } catch (error) {
    next(error);
  }
};

export const restoreExerciseController = async (req, res, next) => {
  try {
    const { id } = req.params;

    const exercise = await restoreExercise(id);

    res.status(200).json({
      message: "Exercise archived successfully",
      exercise,
    });
  } catch (error) {
    next(error);
  }
};

export const getExerciseByIdController = async (req, res) => {
  const exercise = await getExerciseById({
    exerciseId: req.params.id,
  });

  res.status(200).json({
    exercise,
  });
};

export const getExerciseMuscleGroupsController = async (req, res) => {
  const muscleGroups = await getExerciseMuscleGroups();

  res.status(200).json({
    muscleGroups,
  });
};
