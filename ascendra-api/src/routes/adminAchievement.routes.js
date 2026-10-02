import express from "express";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";
import { validate } from "../middleware/validate.js";
import {
  achievementListSchema,
  achievementCreateSchema,
  achievementUpdateSchema,
  achievementIdSchema,
  achievementStatusSchema,
} from "../middleware/validators/adminAchievement.validators.js";
import {
  listAchievementsController,
  getAchievementController,
  createAchievementController,
  updateAchievementController,
  achievementStatusController,
} from "../controllers/adminAchievement.controller.js";

const router = express.Router();
router.use(authenticate, requireRole("admin"));
router.get("/", validate(achievementListSchema), listAchievementsController);
router.post(
  "/",
  validate(achievementCreateSchema),
  createAchievementController,
);
router.get("/:id", validate(achievementIdSchema), getAchievementController);
router.put(
  "/:id",
  validate(achievementUpdateSchema),
  updateAchievementController,
);
router.patch(
  "/:id/status",
  validate(achievementStatusSchema),
  achievementStatusController,
);
export default router;
