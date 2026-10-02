import {
  createWorkoutOfTheWeek,
  getWorkoutOfTheWeekTemplates,
  getWorkoutOfTheWeekById,
  updateWorkoutOfTheWeek,
  archiveWorkoutOfTheWeek,
  restoreWorkoutOfTheWeek,
  createWorkoutOfTheWeekOccurrence,
  getActiveWorkoutOfTheWeekOccurrence,
  getCurrentWorkoutOfTheWeekForUser,
  getWorkoutOfTheWeekHistory,
} from "../services/workoutOfTheWeek.service.js";

export const createWorkoutOfTheWeekController = async (req, res, next) => {
  try {
    const createdBy = req.user.userId;
    const { name, description, bonusXP, exercises, difficulty } = req.body;

    const workoutOfTheWeek = await createWorkoutOfTheWeek({
      name,
      description,
      bonusXP,
      difficulty,
      exercises,
      createdBy,
    });

    res.status(201).json({
      workoutOfTheWeek,
    });
  } catch (error) {
    next(error);
  }
};

export const getWorkoutOfTheWeekTemplatesController = async (
  req,
  res,
  next,
) => {
  try {
    const { page, limit, status } = req.query;

    const result = await getWorkoutOfTheWeekTemplates({
      page,
      limit,
      status,
    });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getWorkoutOfTheWeekByIdController = async (req, res, next) => {
  try {
    const { workoutOfTheWeekId } = req.params;

    const workoutOfTheWeek = await getWorkoutOfTheWeekById({
      workoutOfTheWeekId,
    });

    return res.status(200).json({ workoutOfTheWeek });
  } catch (error) {
    next(error);
  }
};

export const updateWorkoutOfTheWeekController = async (req, res, next) => {
  try {
    const { workoutOfTheWeekId } = req.params;
    const updates = req.body;

    const { workoutOfTheWeek, createdNewTemplate } =
      await updateWorkoutOfTheWeek({
        workoutOfTheWeekId,
        updates,
      });

    return res.status(200).json({ workoutOfTheWeek, createdNewTemplate });
  } catch (error) {
    next(error);
  }
};

export const archiveWorkoutOfTheWeekController = async (req, res, next) => {
  try {
    const { workoutOfTheWeekId } = req.params;

    const workoutOfTheWeek = await archiveWorkoutOfTheWeek({
      workoutOfTheWeekId,
    });

    return res.status(200).json({ workoutOfTheWeek });
  } catch (error) {
    next(error);
  }
};

export const restoreWorkoutOfTheWeekController = async (req, res, next) => {
  try {
    const { workoutOfTheWeekId } = req.params;

    const workoutOfTheWeek = await restoreWorkoutOfTheWeek({
      workoutOfTheWeekId,
    });

    return res.status(200).json({ workoutOfTheWeek });
  } catch (error) {
    next(error);
  }
};

export const createWorkoutOfTheWeekOccurrenceController = async (
  req,
  res,
  next,
) => {
  try {
    const { workoutOfTheWeekId, startDate } = req.body;

    const selectedBy = req.user.userId;

    const occurrence = await createWorkoutOfTheWeekOccurrence({
      workoutOfTheWeekId,
      startDate,
      selectionSource: "admin",
      selectedBy,
    });

    return res.status(201).json({
      occurrence,
    });
  } catch (error) {
    next(error);
  }
};

export const getActiveWorkoutOfTheWeekOccurrenceController = async (
  req,
  res,
  next,
) => {
  try {
    const occurrence = await getActiveWorkoutOfTheWeekOccurrence();

    return res.status(200).json({ occurrence });
  } catch (error) {
    next(error);
  }
};

export const getCurrentWorkoutOfTheWeekForUserController = async (
  req,
  res,
  next,
) => {
  try {
    const userId = req.user.userId;

    const currentWorkoutOfTheWeek =
      await getCurrentWorkoutOfTheWeekForUser(userId);

    res.status(200).json({
      currentWorkoutOfTheWeek,
    });
  } catch (error) {
    next(error);
  }
};

export const getWorkoutOfTheWeekHistoryController = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const { page, limit } = req.query;

    const result = await getWorkoutOfTheWeekHistory({ userId, page, limit });

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
