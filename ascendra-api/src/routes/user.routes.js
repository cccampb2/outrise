import express from "express";
import { authenticate } from "../middleware/auth.js";
import {
  getCurrentUser,
  getPublicUser,
} from "../controllers/user.controller.js";

const router = express.Router();

router.get("/me", authenticate, getCurrentUser);

router.get("/:userId", authenticate, getPublicUser);

export default router;
