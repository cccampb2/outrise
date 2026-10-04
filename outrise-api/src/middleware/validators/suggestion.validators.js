import { Joi } from "celebrate";
import { SUGGESTION_STATUSES } from "../../models/Suggestion.js";
export const createSuggestionSchema = { body: Joi.object({
  title: Joi.string().trim().min(3).max(120).required(),
  message: Joi.string().trim().min(10).max(3000).required(),
}) };
export const listSuggestionsSchema = { query: Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20),
  status: Joi.string().valid("all", ...SUGGESTION_STATUSES).default("new"),
}) };
export const updateSuggestionSchema = {
  params: Joi.object({ suggestionId: Joi.string().hex().length(24).required() }),
  body: Joi.object({ status: Joi.string().valid(...SUGGESTION_STATUSES).required(),
    expectedRevision: Joi.number().integer().min(0).required() }),
};
