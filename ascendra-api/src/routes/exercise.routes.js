import express from "express";
import { authenticate } from "../middleware/auth.js";
import { requireFaction } from "../middleware/requireFaction.js";
import { requireRole } from "../middleware/requireRole.js";
import { validate } from "../middleware/validate.js";
import {
  createExerciseSchema,
  getExercisesSchema,
  updateExerciseSchema,
  exerciseStatusSchema,
} from "../middleware/validators/exercise.validators.js";
import {
  createExerciseController,
  gerExerciseBySlugController,
  getExercisesController,
  updateExerciseController,
  restoreExerciseController,
  archiveExerciseController,
} from "../controllers/exercise.controller.js";

const router = express.Router();

router.post(
  "/",
  authenticate,
  requireFaction,
  requireRole("admin"),
  validate(createExerciseSchema),
  createExerciseController,
);

router.get(
  "/",
  authenticate,
  requireFaction,
  validate(getExercisesSchema),
  getExercisesController,
);

router.get("/:slug", authenticate, requireFaction, gerExerciseBySlugController);

router.patch(
  "/:id",
  authenticate,
  requireFaction,
  requireRole("admin"),
  validate(updateExerciseSchema),
  updateExerciseController,
);

router.patch(
  "/:id/archive",
  authenticate,
  requireFaction,
  requireRole("admin"),
  validate(exerciseStatusSchema),
  archiveExerciseController,
);

router.patch(
  "/:id/restore",
  authenticate,
  requireFaction,
  requireRole("admin"),
  validate(exerciseStatusSchema),
  restoreExerciseController,
);

export default router;
