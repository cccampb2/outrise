import { Joi } from "celebrate";

export const friendListQuerySchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(25),
  }),
};

export const removeFriendSchema = {
  params: Joi.object({
    userId: Joi.string().hex().length(24).required(),
  }),
};

export const cancelFriendRequestSchema = {
  params: Joi.object({
    requestId: Joi.string().hex().length(24).required(),
  }),
};

export const declineFriendRequestSchema = {
  params: Joi.object({
    requestId: Joi.string().hex().length(24).required(),
  }),
};

export const acceptFriendRequestSchema = {
  params: Joi.object({
    requestId: Joi.string().hex().length(24).required(),
  }),
};

export const sendFriendRequestSchema = {
  params: Joi.object({
    userId: Joi.string().hex().length(24).required(),
  }),
};
