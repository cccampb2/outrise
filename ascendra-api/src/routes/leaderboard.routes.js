import express from "express";
import {
  getZenithLeaderBoardController,
  getGlobalLeaderboardController,
} from "../controllers/leaderboard.controller.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { globalLeaderboardQuerySchema } from "../middleware/validators/leaderboard.validators.js";
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

export default router;
