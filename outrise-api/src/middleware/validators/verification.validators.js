import Joi from "joi";

const performanceSchema = Joi.object({
  reps: Joi.number().integer().positive().optional(),
  weightLbs: Joi.number().positive().optional(),
  distanceMiles: Joi.number().positive().optional(),
  timeSeconds: Joi.number().positive().optional(),
}).required();

export const createVerificationSchema = {
  body: Joi.object({
    exercise: Joi.string().hex().length(24).required(),
    performance: performanceSchema,
    idempotencyKey: Joi.string()
      .trim()
      .min(8)
      .max(128)
      .pattern(/^[a-zA-Z0-9:_-]+$/)
      .optional(),
  }),
};

export const rejectVerificationSchema = {
  params: Joi.object({
    verificationId: Joi.string().hex().length(24).required(),
  }),

  body: Joi.object({
    rejectionReason: Joi.string().trim().min(1).max(1000).required(),
  }),
};

export const approveVerificationSchema = {
  params: Joi.object({
    verificationId: Joi.string().hex().length(24).required(),
  }),
};

export const verificationIdSchema = {
  params: Joi.object({
    verificationId: Joi.string().hex().length(24).required(),
  }),
};

export const getVerificationsSchema = {
  query: Joi.object({
    status: Joi.string()
      .valid("pending", "approved", "rejected", "expired")
      .optional(),

    page: Joi.number().integer().min(1).default(1),

    limit: Joi.number().integer().min(1).max(100).default(20),
  }),
};
