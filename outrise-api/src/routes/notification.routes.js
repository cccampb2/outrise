import express from "express";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  notificationListSchema,
  notificationUpdateSchema,
} from "../middleware/validators/notification.validators.js";
import {
  getNotificationsController,
  getUnreadCountController,
  markNotificationsReadController,
  dismissNotificationsController,
} from "../controllers/notification.controller.js";

const router = express.Router();
router.use(authenticate);
router.get("/", validate(notificationListSchema), getNotificationsController);
router.get("/unread-count", getUnreadCountController);
router.post(
  "/read",
  validate(notificationUpdateSchema),
  markNotificationsReadController,
);
router.post(
  "/dismiss",
  validate(notificationUpdateSchema),
  dismissNotificationsController,
);
export default router;
