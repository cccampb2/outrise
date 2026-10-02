import { Joi } from "celebrate";

export const notificationListSchema = { query: Joi.object({ page: Joi.number().integer().min(1).default(1), limit: Joi.number().integer().min(1).max(50).default(20), unreadOnly: Joi.boolean().default(false) }) };
export const notificationUpdateSchema = { body: Joi.object({
  eventIds: Joi.array().items(Joi.string().hex().length(24).lowercase().required()).min(1).max(50).unique(),
  all: Joi.boolean().valid(true),
}).xor("eventIds", "all") };
