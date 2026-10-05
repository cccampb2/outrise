import express from "express";
import {
  profileRecordsSchema,
  profileAchievementsSchema,
} from "../middleware/validators/profileRecords.validators.js";
import {
  getProfileAchievementsController,
  getProfilePerformancesController,
} from "../controllers/profileRecords.controller.js";
import { authenticate, authenticateUnverified } from "../middleware/auth.js";
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

const router = express.Router();

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
