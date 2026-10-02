import { Joi } from "celebrate";
import Achievement from "../../models/Achievement.js";

const id = Joi.object({ id: Joi.string().hex().length(24).required() });
const body = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .pattern(/[a-zA-Z0-9]/)
    .required(),
  description: Joi.string().trim().min(1).max(1000).required(),
  category: Joi.string()
    .valid(...Achievement.schema.path("category").enumValues)
    .required(),
  requirementType: Joi.string()
    .valid(...Achievement.schema.path("requirementType").enumValues)
    .required(),
  requirement: Joi.object({
    value: Joi.number().required(),
    exercise: Joi.string().hex().length(24).allow(null).default(null),
    recordCategory: Joi.string().trim().max(40).allow(null).default(null),
    operator: Joi.string().valid("before", "after").allow(null).default(null),
  }).required(),
  xpReward: Joi.number().integer().min(1).required(),
  badgeKey: Joi.string().trim().min(1).max(100).required(),
  isSecret: Joi.boolean().default(false),
  isActive: Joi.boolean().default(true),
});
export const achievementListSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
    search: Joi.string().trim().max(100),
    status: Joi.string().valid("active", "inactive", "all").default("all"),
  }),
};
export const achievementCreateSchema = { body };
export const achievementUpdateSchema = { params: id, body };
export const achievementIdSchema = { params: id };
export const achievementStatusSchema = {
  params: id,
  body: Joi.object({ isActive: Joi.boolean().required() }),
};
