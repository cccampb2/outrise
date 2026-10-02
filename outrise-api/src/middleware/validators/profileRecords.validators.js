import { Joi } from "celebrate";

export const profileRecordsSchema = {
  params: Joi.object({ userId: Joi.string().hex().length(24).required() }),
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(5),
  }),
};

export const profileAchievementsSchema = {
  ...profileRecordsSchema,
  query: profileRecordsSchema.query.keys({
    view: Joi.string().valid("unlocked", "catalog").default("unlocked"),
  }),
};
