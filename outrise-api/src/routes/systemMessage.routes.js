import express from "express";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  getSystemMessagesSchema,
  getSystemMessageSchema,
  markSystemMessagesReadSchema,
} from "../middleware/validators/systemMessage.validators.js";
import {
  getSystemMessagesController,
  getSystemMessageController,
  getSystemMessageSummaryController,
  getSystemMessageUnreadCountController,
  markSystemMessagesReadController,
} from "../controllers/systemMessage.controller.js";

const router = express.Router();
router.use(authenticate);
router.get("/summary", getSystemMessageSummaryController);
router.get("/unread-count", getSystemMessageUnreadCountController);
router.post(
  "/read",
  validate(markSystemMessagesReadSchema),
  markSystemMessagesReadController,
);
router.get("/", validate(getSystemMessagesSchema), getSystemMessagesController);
router.get(
  "/:messageId",
  validate(getSystemMessageSchema),
  getSystemMessageController,
);

export default router;
