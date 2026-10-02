import express from "express";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  activityFeedQuerySchema,
  dismissActivityEventsSchema,
} from "../middleware/validators/activity.validators.js";
import {
  dismissActivityEventsController,
  getActivityFeedController,
} from "../controllers/activity.controller.js";

const router = express.Router();
router.post(
  "/dismiss",
  authenticate,
  validate(dismissActivityEventsSchema),
  dismissActivityEventsController,
);
router.get(
  "/",
  authenticate,
  validate(activityFeedQuerySchema),
  getActivityFeedController,
);
export default router;
