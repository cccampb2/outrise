import express from "express";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";
import { validate } from "../middleware/validate.js";
import {
  listSuggestionsSchema,
  updateSuggestionSchema,
} from "../middleware/validators/suggestion.validators.js";
import {
  listSuggestionsController,
  updateSuggestionController,
} from "../controllers/suggestion.controller.js";
const router = express.Router();
router.use(authenticate, requireRole("owner"));
router.get("/", validate(listSuggestionsSchema), listSuggestionsController);
router.patch(
  "/:suggestionId",
  validate(updateSuggestionSchema),
  updateSuggestionController,
);
export default router;
