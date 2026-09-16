import {
  startWorkoutSession,
  getActiveWorkoutSession,
  updateSessionExercise,
  cancelActiveWorkouSession,
  completeActiveWorkoutSession,
  updateSessionExerciseSkipped,
  getWorkoutSessionHistory,
  getWorkoutSessionById,
  repeatWorkoutSession,
  startWorkoutOfTheWeekSession,
} from "../services/workoutSession.service.js";

export const startWorkoutSessionController = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const { workoutId } = req.body;

    const workoutSession = await startWorkoutSession({ userId, workoutId });
    return res.status(201).json({ workoutSession });
  } catch (error) {
    next(error);
  }
};

export const getActiveWorkoutSessionController = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const workoutSession = await getActiveWorkoutSession({ userId });

    return res.status(200).json({ workoutSession });
  } catch (error) {
    next(error);
  }
};

export const updateSessionExerciseController = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const exerciseOrder = Number(req.params.order);

    const actual = req.body;

    const workoutSession = await updateSessionExercise({
      userId,
      exerciseOrder,
      actual,
    });

    return res.status(200).json({
      message: "Workout exercise updated successfully",
      workoutSession,
    });
  } catch (error) {
    next(error);
  }
};

export const cancelActiveWorkouSessionController = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const workoutSession = await cancelActiveWorkouSession({ userId });

    return res.status(200).json({
      message: "Workout session cancelled successfully",
      workoutSession,
    });
  } catch (error) {
    next(error);
  }
};

export const completeActiveWorkoutSessionController = async (
  req,
  res,
  next,
) => {
  try {
    const userId = req.user.userId;

    const result = await completeActiveWorkoutSession({ userId });

    return res.status(200).json({
      workoutSession: result.workoutSession,
      newPersonalRecords: result.newPersonalRecords,
      echelonRewards: result.echelonRewards,
      xpEarned: result.xpEarned,
      dailyXP: result.dailyXP,
    });
  } catch (error) {
    next(error);
  }
};

export const updateSessionExerciseSkippedController = async (
  req,
  res,
  next,
) => {
  try {
    const userId = req.user.userId;

    const exerciseOrder = Number(req.params.order);

    const { skipped } = req.body;
    const workoutSession = await updateSessionExerciseSkipped({
      userId,
      exerciseOrder,
      skipped,
    });

    return res.status(200).json({
      message: "Workout exercise skip status updated successfully",
      workoutSession,
    });
  } catch (error) {
    next(error);
  }
};

export const getWorkoutSessionHistoryController = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { limit, page, status } = req.query;

    const workoutSessions = await getWorkoutSessionHistory({
      userId,
      limit,
      page,
      status,
    });

    return res.status(200).json(workoutSessions);
  } catch (error) {
    next(error);
  }
};

export const getWorkoutSessionByIdController = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const sessionId = req.params.id;

    const workoutSession = await getWorkoutSessionById({ userId, sessionId });

    return res.status(200).json({ workoutSession });
  } catch (error) {
    next(error);
  }
};

export const repeatWorkoutSessionController = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.userId;

    const workoutSession = await repeatWorkoutSession({ userId, sessionId });

    return res.status(201).json({
      workoutSession,
    });
  } catch (error) {
    next(error);
  }
};

export const startWorkoutOfTheWeekSessionController = async (
  req,
  res,
  next,
) => {
  try {
    const userId = req.user.userId;

    const workoutSession = await startWorkoutOfTheWeekSession({ userId });

    return res.status(201).json({
      workoutSession,
    });
  } catch (error) {
    next(error);
  }
};
