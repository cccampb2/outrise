import express from "express";
import {
  getFactions,
  getFactionAssessment,
  submitFactionAssessment,
  confirmUserFaction,
} from "../controllers/faction.controller.js";
import { authenticate } from "../middleware/auth.js";
import { requireNoFaction } from "../middleware/requireNoFaction.js";
import {
  submitFactionAssessmentSchema,
  confirmFactionSchema,
} from "../middleware/validators/faction.validators.js";
import { validate } from "../middleware/validate.js";
const router = express.Router();

router.get("/", getFactions);
router.get("/assessment", authenticate, requireNoFaction, getFactionAssessment);
router.post(
  "/assessment",
  authenticate,
  requireNoFaction,
  validate(submitFactionAssessmentSchema),
  submitFactionAssessment,
);
router.post(
  "/confirm",
  authenticate,
  requireNoFaction,
  validate(confirmFactionSchema),
  confirmUserFaction,
);

export default router;
