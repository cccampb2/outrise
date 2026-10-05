import express from "express";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { limitSuggestions } from "../middleware/suggestionRateLimit.js";
import { createSuggestionSchema } from "../middleware/validators/suggestion.validators.js";
import { createSuggestionController } from "../controllers/suggestion.controller.js";
const router = express.Router();
router.post(
  "/",
  authenticate,
  validate(createSuggestionSchema),
  limitSuggestions,
  createSuggestionController,
);
export default router;
