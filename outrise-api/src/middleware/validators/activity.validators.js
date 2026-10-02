import { Joi } from "celebrate";

export const dismissActivityEventsSchema = {
  body: Joi.object({
    eventIds: Joi.array()
      .items(Joi.string().hex().length(24).lowercase().required())
      .min(1)
      .max(50)
      .unique()
      .required(),
  }),
};

export const activityFeedQuerySchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(25),
  }),
};
