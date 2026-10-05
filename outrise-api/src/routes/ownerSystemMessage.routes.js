import express from "express";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";
import { validate } from "../middleware/validate.js";
import {
  publishSystemMessageSchema,
  getSystemMessagesSchema,
} from "../middleware/validators/systemMessage.validators.js";
import {
  publishSystemMessageController,
  getOwnerSystemMessagesController,
} from "../controllers/systemMessage.controller.js";

const router = express.Router();
router.use(authenticate, requireRole("owner"));
router.get(
  "/",
  validate(getSystemMessagesSchema),
  getOwnerSystemMessagesController,
);
router.post(
  "/",
  validate(publishSystemMessageSchema),
  publishSystemMessageController,
);

export default router;
