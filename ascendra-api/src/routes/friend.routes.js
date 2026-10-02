import express from "express";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  acceptFriendRequestSchema,
  cancelFriendRequestSchema,
  declineFriendRequestSchema,
  friendListQuerySchema,
  removeFriendSchema,
  sendFriendRequestSchema,
} from "../middleware/validators/friend.validators.js";
import {
  acceptFriendRequestController,
  cancelFriendRequestController,
  declineFriendRequestController,
  getFriendsController,
  getIncomingFriendRequestsController,
  getOutgoingFriendRequestsController,
  removeFriendController,
  sendFriendRequestController,
} from "../controllers/friend.controller.js";

const router = express.Router();

router.get(
  "/",
  authenticate,
  validate(friendListQuerySchema),
  getFriendsController,
);
router.get(
  "/requests/incoming",
  authenticate,
  validate(friendListQuerySchema),
  getIncomingFriendRequestsController,
);
router.get(
  "/requests/outgoing",
  authenticate,
  validate(friendListQuerySchema),
  getOutgoingFriendRequestsController,
);

router.delete(
  "/requests/:requestId/cancel",
  authenticate,
  validate(cancelFriendRequestSchema),
  cancelFriendRequestController,
);

router.delete(
  "/requests/:requestId/decline",
  authenticate,
  validate(declineFriendRequestSchema),
  declineFriendRequestController,
);

router.patch(
  "/requests/:requestId/accept",
  authenticate,
  validate(acceptFriendRequestSchema),
  acceptFriendRequestController,
);

router.post(
  "/requests/:userId",
  authenticate,
  validate(sendFriendRequestSchema),
  sendFriendRequestController,
);

router.delete(
  "/:userId",
  authenticate,
  validate(removeFriendSchema),
  removeFriendController,
);

export default router;
