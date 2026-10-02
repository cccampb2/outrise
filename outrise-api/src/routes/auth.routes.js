import express from "express";
import { validate } from "../middleware/validate.js";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../middleware/validators/auth.validators.js";
import { register, login, forgotPassword, resetPasswordController } from "../controllers/auth.controllers.js";
import { limitPasswordResetRequests, limitPasswordResetAttempts } from "../middleware/passwordResetRateLimit.js";

const router = express.Router();

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);

router.post("/forgot-password", limitPasswordResetRequests, validate(forgotPasswordSchema), forgotPassword);
router.post("/reset-password", limitPasswordResetAttempts, validate(resetPasswordSchema), resetPasswordController);

export default router;
