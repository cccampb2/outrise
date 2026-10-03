import express from "express";
import { validate } from "../middleware/validate.js";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  requestEmailVerificationSchema,
  verifyEmailSchema,
} from "../middleware/validators/auth.validators.js";
import { register, login, forgotPassword, resetPasswordController, requestEmailVerificationController, verifyEmailController } from "../controllers/auth.controllers.js";
import { createPasswordResetLimiter, limitPasswordResetRequests, limitPasswordResetAttempts } from "../middleware/passwordResetRateLimit.js";

import { authenticateUnverified } from "../middleware/auth.js";

const router = express.Router();
const limitVerificationRequests = createPasswordResetLimiter({ message: "Too many verification email requests. Please wait a few minutes and try again." });
const limitVerificationAttempts = createPasswordResetLimiter({ max: 20, message: "Too many verification attempts. Please wait a few minutes and try again." });

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);

router.post("/forgot-password", limitPasswordResetRequests, validate(forgotPasswordSchema), forgotPassword);
router.post("/reset-password", limitPasswordResetAttempts, validate(resetPasswordSchema), resetPasswordController);

router.post("/email-verification/request", authenticateUnverified, limitVerificationRequests, validate(requestEmailVerificationSchema), requestEmailVerificationController);
router.post("/email-verification/confirm", authenticateUnverified, limitVerificationAttempts, validate(verifyEmailSchema), verifyEmailController);

export default router;
