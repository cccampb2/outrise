import express from "express";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  getOrCreateConversationSchema,
  sendMessageSchema,
  getConversationMessagesSchema,
  getConversationsSchema,
  markConversationReadSchema,
} from "../middleware/validators/message.validators.js";
import {
  getOrCreateConversationController,
  sendMessageController,
  getConversationMessagesController,
  getConversationsController,
  getUnreadMessageCountController,
  markConversationReadController,
} from "../controllers/message.controller.js";

const router = express.Router();

router.use(authenticate);
router.get("/unread-count", getUnreadMessageCountController);
router.post("/:conversationId/read", validate(markConversationReadSchema), markConversationReadController);

router.get("/", validate(getConversationsSchema), getConversationsController);

router.post(
  "/with/:userId",
  validate(getOrCreateConversationSchema),
  getOrCreateConversationController,
);

router.post(
  "/:conversationId/messages",
  validate(sendMessageSchema),
  sendMessageController,
);

router.get(
  "/:conversationId/messages",
  validate(getConversationMessagesSchema),
  getConversationMessagesController,
);

export default router;
