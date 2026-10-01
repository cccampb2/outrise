import express from "express";
import { authenticate } from "../middleware/auth.js";
import {
  getCurrentUser,
  getPublicUser,
  searchUsers,
} from "../controllers/user.controller.js";

const router = express.Router();

router.get("/me", authenticate, getCurrentUser);

router.get("/search", authenticate, searchUsers);

router.get("/:userId", authenticate, getPublicUser);

export default router;
