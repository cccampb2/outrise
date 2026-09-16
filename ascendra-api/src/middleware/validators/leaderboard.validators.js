import { Joi } from "celebrate";

export const globalLeaderboardQuerySchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(25),
  }),
};
