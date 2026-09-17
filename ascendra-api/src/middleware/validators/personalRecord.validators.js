import { Joi } from "celebrate";

export const personalRecordHistorySchema = {
  params: Joi.object({
    exerciseId: Joi.string().hex().length(24).required(),
  }),
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(20),
    recordCategory: Joi.string().trim().optional(),
  }),
};
