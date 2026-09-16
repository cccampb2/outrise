import express from "express";
import { validate } from "../middleware/validate.js";
import { authenticate } from "../middleware/auth.js";
import { requireFaction } from "../middleware/requireFaction.js";

import {
  repeatWorkoutSessionSchema,
  startWorkoutSessionSchema,
  updateSessionExerciseSchema,
  updateSessionExerciseSkippedSchema,
  workoutSessionHistorySchema,
  workoutSessionIdSchema,
} from "../middleware/validators/workoutSession.validators.js";
import {
  startWorkoutSessionController,
  getActiveWorkoutSessionController,
  updateSessionExerciseController,
  cancelActiveWorkouSessionController,
  completeActiveWorkoutSessionController,
  updateSessionExerciseSkippedController,
  getWorkoutSessionHistoryController,
  getWorkoutSessionByIdController,
  repeatWorkoutSessionController,
  startWorkoutOfTheWeekSessionController,
} from "../controllers/workoutSession.controller.js";

const router = express.Router();

router.post(
  "/start",
  authenticate,
  requireFaction,
  validate(startWorkoutSessionSchema),
  startWorkoutSessionController,
);

router.post(
  "/wotw",
  authenticate,
  requireFaction,
  startWorkoutOfTheWeekSessionController,
);

router.get(
  "/active",
  authenticate,
  requireFaction,
  getActiveWorkoutSessionController,
);

router.patch(
  "/active/exercises/:order",
  authenticate,
  requireFaction,
  validate(updateSessionExerciseSchema),
  updateSessionExerciseController,
);

router.patch(
  "/active/cancel",
  authenticate,
  requireFaction,
  cancelActiveWorkouSessionController,
);

router.patch(
  "/active/complete",
  authenticate,
  requireFaction,
  completeActiveWorkoutSessionController,
);

router.patch(
  "/active/exercises/:order/skip",
  authenticate,
  requireFaction,
  validate(updateSessionExerciseSkippedSchema),
  updateSessionExerciseSkippedController,
);

router.get(
  "/history",
  authenticate,
  requireFaction,
  validate(workoutSessionHistorySchema),
  getWorkoutSessionHistoryController,
);

router.get(
  "/:id",
  authenticate,
  requireFaction,
  validate(workoutSessionIdSchema),
  getWorkoutSessionByIdController,
);

router.post(
  "/:sessionId/repeat",
  authenticate,
  requireFaction,
  validate(repeatWorkoutSessionSchema),
  repeatWorkoutSessionController,
);

export default router;
