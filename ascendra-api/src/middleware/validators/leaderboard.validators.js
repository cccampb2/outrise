import { Joi } from "celebrate";

export const globalLeaderboardQuerySchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(25),
  }),
};

export const factionLeaderboardSchema = {
  params: Joi.object({
    factionSlug: Joi.string()
      .trim()
      .lowercase()
      .valid("helix", "aegis", "nova", "rally")
      .required(),
  }),

  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(25),
  }),
};
