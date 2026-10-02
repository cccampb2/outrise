import express from "express";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";
import { validate } from "../middleware/validate.js";
import { requireFaction } from "../middleware/requireFaction.js";
import {
  createWorkoutOfTheWeekSchema,
  getWorkoutOfTheWeekTemplatesSchema,
  workoutOfTheWeekIdSchema,
  updateWorkoutOfTheWeekSchema,
  createWorkoutOfTheWeekOccurrenceSchema,
  getWorkoutOfTheWeekHistorySchema,
} from "../middleware/validators/workoutOfTheWeek.validators.js";
import {
  createWorkoutOfTheWeekController,
  getWorkoutOfTheWeekTemplatesController,
  getWorkoutOfTheWeekByIdController,
  updateWorkoutOfTheWeekController,
  restoreWorkoutOfTheWeekController,
  archiveWorkoutOfTheWeekController,
  createWorkoutOfTheWeekOccurrenceController,
  getActiveWorkoutOfTheWeekOccurrenceController,
  getCurrentWorkoutOfTheWeekForUserController,
  getWorkoutOfTheWeekHistoryController,
} from "../controllers/workoutOfTheWeek.controller.js";

const router = express.Router();

router.post(
  "/",
  authenticate,
  requireRole("admin"),
  validate(createWorkoutOfTheWeekSchema),
  createWorkoutOfTheWeekController,
);

router.get(
  "/",
  authenticate,
  requireRole("admin"),
  validate(getWorkoutOfTheWeekTemplatesSchema),
  getWorkoutOfTheWeekTemplatesController,
);

router.get(
  "/occurrences/active",
  authenticate,
  requireFaction,
  getActiveWorkoutOfTheWeekOccurrenceController,
);

router.get(
  "/current",
  authenticate,
  requireFaction,
  getCurrentWorkoutOfTheWeekForUserController,
);

router.get(
  "/history",
  authenticate,
  requireFaction,
  validate(getWorkoutOfTheWeekHistorySchema),
  getWorkoutOfTheWeekHistoryController,
);

router.post(
  "/occurrences",
  authenticate,
  requireRole("admin"),
  validate(createWorkoutOfTheWeekOccurrenceSchema),
  createWorkoutOfTheWeekOccurrenceController,
);

router.get(
  "/:workoutOfTheWeekId",
  authenticate,
  requireRole("admin"),
  validate(workoutOfTheWeekIdSchema),
  getWorkoutOfTheWeekByIdController,
);

router.patch(
  "/:workoutOfTheWeekId",
  authenticate,
  requireRole("admin"),
  validate(updateWorkoutOfTheWeekSchema),
  updateWorkoutOfTheWeekController,
);

router.patch(
  "/:workoutOfTheWeekId/archive",
  authenticate,
  requireRole("admin"),
  validate(workoutOfTheWeekIdSchema),
  archiveWorkoutOfTheWeekController,
);

router.patch(
  "/:workoutOfTheWeekId/restore",
  authenticate,
  requireRole("admin"),
  validate(workoutOfTheWeekIdSchema),
  restoreWorkoutOfTheWeekController,
);

export default router;
