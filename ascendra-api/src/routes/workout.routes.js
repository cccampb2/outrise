import express from "express";
import { authenticate } from "../middleware/auth.js";
import { requireFaction } from "../middleware/requireFaction.js";
import { validate } from "../middleware/validate.js";
import {
  createWorkoutSchema,
  getMyWorkoutsSchema,
  workoutIdParamSchema,
  updateWorkoutSchema,
} from "../middleware/validators/workout.validators.js";
import {
  archiveWorkoutController,
  createWorkoutController,
  getMyWorkoutsController,
  getWorkoutByIdController,
  restoreWorkoutController,
  updateWorkoutController,
  duplicateWorkoutController,
} from "../controllers/workout.controller.js";
import { archiveWorkout, restoreWorkout } from "../services/workout.service.js";

const router = express.Router();

router.post(
  "/",
  authenticate,
  requireFaction,
  validate(createWorkoutSchema),
  createWorkoutController,
);

router.get(
  "/",
  authenticate,
  requireFaction,
  validate(getMyWorkoutsSchema),
  getMyWorkoutsController,
);

router.get(
  "/:id",
  authenticate,
  requireFaction,
  validate(workoutIdParamSchema),
  getWorkoutByIdController,
);

router.patch(
  "/:id",
  authenticate,
  requireFaction,
  validate(updateWorkoutSchema),
  updateWorkoutController,
);

router.patch(
  "/:id/archive",
  authenticate,
  requireFaction,
  validate(workoutIdParamSchema),
  archiveWorkoutController,
);

router.patch(
  "/:id/restore",
  authenticate,
  requireFaction,
  validate(workoutIdParamSchema),
  restoreWorkoutController,
);

router.post(
  "/:id/duplicate",
  authenticate,
  requireFaction,
  validate(workoutIdParamSchema),
  duplicateWorkoutController,
);

export default router;
