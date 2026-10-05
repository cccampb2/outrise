import { Joi } from "celebrate";

export const publishSystemMessageSchema = {
  body: Joi.object({
    title: Joi.string().trim().min(1).max(120).required(),
    text: Joi.string().trim().min(1).max(4000).required(),
    idempotencyKey: Joi.string().min(1).max(100).pattern(/\S/).required(),
  }),
};

export const getSystemMessagesSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
  }),
};

export const getSystemMessageSchema = {
  params: Joi.object({ messageId: Joi.string().hex().length(24).required() }),
};

export const markSystemMessagesReadSchema = {
  body: Joi.object({
    eventIds: Joi.array()
      .items(Joi.string().hex().length(24).lowercase().required())
      .min(1)
      .max(50)
      .unique()
      .required(),
  }),
};
