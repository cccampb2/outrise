import express from "express";
import {
  profileRecordsSchema,
  profileAchievementsSchema,
} from "../middleware/validators/profileRecords.validators.js";
import {
  getProfileAchievementsController,
  getProfilePerformancesController,
} from "../controllers/profileRecords.controller.js";
import {
  authenticate,
  authenticateUnverified,
  authenticateAccountDeletion,
} from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { updateProfileSchema } from "../middleware/validators/user.validators.js";
import {
  getCurrentUser,
  getPublicUser,
  searchUsers,
  updateCurrentUser,
  updateProfileImage,
  removeProfileImage,
} from "../controllers/user.controller.js";

import { uploadProfileImage } from "../middleware/upload-profile-image.js";

import { deleteAccountController } from "../controllers/accountDeletion.controller.js";
import { deleteAccountSchema } from "../middleware/validators/accountDeletion.validators.js";
import { createPasswordResetLimiter } from "../middleware/passwordResetRateLimit.js";

import {
  blockUserController,
  unblockUserController,
  getBlockedUsersController,
  getBlockRelationshipController,
} from "../controllers/block.controller.js";
import {
  friendListQuerySchema,
  removeFriendSchema,
} from "../middleware/validators/friend.validators.js";
const router = express.Router();
router.get(
  "/me/blocked-users",
  authenticate,
  validate(friendListQuerySchema),
  getBlockedUsersController,
);
router.get(
  "/:userId/block",
  authenticate,
  validate(removeFriendSchema),
  getBlockRelationshipController,
);
router.put(
  "/:userId/block",
  authenticate,
  validate(removeFriendSchema),
  blockUserController,
);
router.delete(
  "/:userId/block",
  authenticate,
  validate(removeFriendSchema),
  unblockUserController,
);
router.delete(
  "/me",
  authenticateAccountDeletion,
  createPasswordResetLimiter({
    max: 5,
    message: "Too many deletion attempts. Please try again later.",
  }),
  validate(deleteAccountSchema),
  deleteAccountController,
);

router.get("/me", authenticateUnverified, getCurrentUser);

router.patch(
  "/me",
  authenticate,
  validate(updateProfileSchema),
  updateCurrentUser,
);

router.patch(
  "/me/profile-image",
  authenticate,
  uploadProfileImage,
  updateProfileImage,
);

router.delete("/me/profile-image", authenticate, removeProfileImage);

router.get("/search", authenticate, searchUsers);

router.get("/:userId", authenticate, getPublicUser);
router.get(
  "/:userId/achievements",
  authenticate,
  validate(profileAchievementsSchema),
  getProfileAchievementsController,
);
router.get(
  "/:userId/performances",
  authenticate,
  validate(profileRecordsSchema),
  getProfilePerformancesController,
);

export default router;
