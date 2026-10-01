import express from "express";
import { authenticate } from "../middleware/auth.js";
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

router.get("/me", authenticate, getCurrentUser);

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

export default router;
