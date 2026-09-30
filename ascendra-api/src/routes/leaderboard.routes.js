import express from "express";
import {
  getZenithLeaderBoardController,
  getGlobalLeaderboardController,
  getFactionStandingsController,
  getFactionLeaderboardController,
} from "../controllers/leaderboard.controller.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  globalLeaderboardQuerySchema,
  factionLeaderboardSchema,
} from "../middleware/validators/leaderboard.validators.js";
import { requireFaction } from "../middleware/requireFaction.js";

const router = express.Router();

router.get(
  "/zenith",
  authenticate,
  requireFaction,
  getZenithLeaderBoardController,
);
router.get(
  "/global",
  authenticate,
  requireFaction,
  validate(globalLeaderboardQuerySchema),
  getGlobalLeaderboardController,
);

router.get(
  "/factions",
  authenticate,
  requireFaction,
  getFactionStandingsController,
);

router.get(
  "/factions/:factionSlug",
  authenticate,
  requireFaction,
  validate(factionLeaderboardSchema),
  getFactionLeaderboardController,
);

export default router;
