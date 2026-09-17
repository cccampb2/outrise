import Joi from "joi";

const performanceSchema = Joi.object({
  reps: Joi.number().integer().positive().optional(),
  weightLbs: Joi.number().positive().optional(),
  distanceMiles: Joi.number().positive().optional(),
  timeSeconds: Joi.number().positive().optional(),
}).required();

const proofSchema = Joi.object({
  type: Joi.string().valid("image", "video").required(),
  url: Joi.string().uri().required(),
  publicId: Joi.string().trim().required(),
}).required();

export const createVerificationSchema = {
  body: Joi.object({
    exercise: Joi.string().hex().length(24).required(),
    performance: performanceSchema,
    proof: proofSchema,
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
    status: Joi.string().valid("pending", "approved", "rejected").optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),
};
