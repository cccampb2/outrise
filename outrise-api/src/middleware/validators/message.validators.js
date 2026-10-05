import { Joi } from "celebrate";

export const getOrCreateConversationSchema = {
  params: Joi.object({
    userId: Joi.string().hex().length(24).required(),
  }),
};

export const sendMessageSchema = {
  params: Joi.object({
    conversationId: Joi.string().hex().length(24).required(),
  }),
  body: Joi.object({
    text: Joi.string().trim().min(1).max(2000).required(),
    idempotencyKey: Joi.string().min(1).max(100).pattern(/\S/).required(),
  }),
};

export const getConversationMessagesSchema = {
  params: Joi.object({
    conversationId: Joi.string().hex().length(24).required(),
  }),

  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(30),
  }),
};

export const getConversationsSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
  }),
};

export const markConversationReadSchema = {
  params: Joi.object({
    conversationId: Joi.string().hex().length(24).required(),
  }),
  body: Joi.object({
    throughMessageId: Joi.string().hex().length(24).required(),
  }),
};
