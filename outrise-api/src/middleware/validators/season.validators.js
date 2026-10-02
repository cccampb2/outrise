import { Joi } from "celebrate";

export const seasonHistoryQuerySchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
  }),
};

export const seasonIdParamSchema = {
  params: Joi.object({
    seasonId: Joi.string().hex().length(24).required(),
  }),
};
