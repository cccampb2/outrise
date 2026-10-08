import express from "express";
import {
  getLegalDocumentsController,
  acceptLegalDocumentsController,
} from "../controllers/legal.controller.js";
import { acceptLegalSchema } from "../middleware/validators/legal.validators.js";
import { validate } from "../middleware/validate.js";
import {
  registerSchema,
  ageEligibilitySchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  requestEmailVerificationSchema,
  verifyEmailSchema,
} from "../middleware/validators/auth.validators.js";
import {
  register,
  confirmAgeEligibilityController,
  login,
  forgotPassword,
  resetPasswordController,
  requestEmailVerificationController,
  verifyEmailController,
} from "../controllers/auth.controllers.js";
import {
  createPasswordResetLimiter,
  limitPasswordResetRequests,
  limitPasswordResetAttempts,
} from "../middleware/passwordResetRateLimit.js";

import { authenticateUnverified } from "../middleware/auth.js";

const router = express.Router();
const limitVerificationRequests = createPasswordResetLimiter({
  message:
    "Too many verification email requests. Please wait a few minutes and try again.",
});
const limitVerificationAttempts = createPasswordResetLimiter({
  max: 20,
  message:
    "Too many verification attempts. Please wait a few minutes and try again.",
});

router.get("/legal", getLegalDocumentsController);
router.post(
  "/legal/accept",
  authenticateUnverified,
  validate(acceptLegalSchema),
  acceptLegalDocumentsController,
);
router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.post(
  "/age-eligibility",
  authenticateUnverified,
  validate(ageEligibilitySchema),
  confirmAgeEligibilityController,
);

router.post(
  "/forgot-password",
  limitPasswordResetRequests,
  validate(forgotPasswordSchema),
  forgotPassword,
);
router.post(
  "/reset-password",
  limitPasswordResetAttempts,
  validate(resetPasswordSchema),
  resetPasswordController,
);

router.post(
  "/email-verification/request",
  authenticateUnverified,
  limitVerificationRequests,
  validate(requestEmailVerificationSchema),
  requestEmailVerificationController,
);
router.post(
  "/email-verification/confirm",
  authenticateUnverified,
  limitVerificationAttempts,
  validate(verifyEmailSchema),
  verifyEmailController,
);

export default router;
