import express from "express";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";
import { validate } from "../middleware/validate.js";
import { requireFaction } from "../middleware/requireFaction.js";
import {
  createVerificationSchema,
  verificationIdSchema,
  getVerificationsSchema,
  rejectVerificationSchema,
  approveVerificationSchema,
} from "../middleware/validators/verification.validators.js";

import {
  createVerificationController,
  getUserVerificationByIdController,
  getUserVerificationsController,
  getAdminVerificationsController,
  getAdminVerificationByIdController,
  rejectVerificationController,
  approveVerificationController,
} from "../controllers/verification.controller.js";

const router = express.Router();

router.post(
  "/",
  authenticate,
  requireFaction,
  validate(createVerificationSchema),
  createVerificationController,
);

router.get(
  "/",
  authenticate,
  requireFaction,
  validate(getVerificationsSchema),
  getUserVerificationsController,
);

router.get(
  "/admin",
  authenticate,
  requireRole("admin"),
  validate(getVerificationsSchema),
  getAdminVerificationsController,
);

router.get(
  "/admin/:verificationId",
  authenticate,
  requireRole("admin"),
  validate(verificationIdSchema),
  getAdminVerificationByIdController,
);

router.patch(
  "/admin/:verificationId/approve",
  authenticate,
  requireRole("admin"),
  validate(approveVerificationSchema),
  approveVerificationController,
);

router.patch(
  "/admin/:verificationId/reject",
  authenticate,
  requireRole("admin"),
  validate(rejectVerificationSchema),
  rejectVerificationController,
);

router.get(
  "/:verificationId",
  authenticate,
  requireFaction,
  validate(verificationIdSchema),
  getUserVerificationByIdController,
);

export default router;
