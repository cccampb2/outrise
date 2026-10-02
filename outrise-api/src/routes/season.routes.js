import express from "express";
import { authenticate } from "../middleware/auth.js";
import { requireFaction } from "../middleware/requireFaction.js";
import {
  getCurrentSeasonController,
  getCurrentSeasonStandingsController,
  getSeasonByIdController,
  getSeasonHistoryController,
} from "../controllers/season.controller.js";
import { validate } from "../middleware/validate.js";
import {
  seasonHistoryQuerySchema,
  seasonIdParamSchema,
} from "../middleware/validators/season.validators.js";

const router = express.Router();

router.get(
  "/current",
  authenticate,
  requireFaction,
  getCurrentSeasonController,
);

router.get(
  "/current/standings",
  authenticate,
  requireFaction,
  getCurrentSeasonStandingsController,
);

router.get(
  "/history",
  authenticate,
  requireFaction,
  validate(seasonHistoryQuerySchema),
  getSeasonHistoryController,
);

router.get(
  "/:seasonId",
  authenticate,
  requireFaction,
  validate(seasonIdParamSchema),
  getSeasonByIdController,
);

export default router;
