import { Joi } from "celebrate";

const ageSchema = Joi.number()
  .integer()
  .min(18)
  .max(120)
  .strict()
  .required()
  .messages({
    "number.min": "Outrise beta is available to adults aged 18 or older.",
  });

// Under-18 answers must reach the service so authenticated rejections can be remembered.
export const ageEligibilitySchema = {
  body: Joi.object({
    age: Joi.number().integer().min(0).max(120).strict().required(),
  }),
};

const passwordSchema = Joi.string()
  .min(8)
  .custom((value, helpers) => {
    if (Buffer.byteLength(value, "utf8") > 72) {
      return helpers.message({
        custom: "Password must be no more than 72 UTF-8 bytes.",
      });
    }
    return value;
  });

export const registerSchema = {
  body: Joi.object({
    username: Joi.string().trim().min(3).max(30).required(),
    age: ageSchema,
    accepted: Joi.boolean().valid(true).strict().required(),
    termsVersion: Joi.string().max(50).required(),
    privacyVersion: Joi.string().max(50).required(),
    email: Joi.string().trim().email().required(),
    password: passwordSchema.required(),
  }),
};

export const loginSchema = {
  body: Joi.object({
    email: Joi.string().trim().email().required(),
    password: Joi.string().required(),
  }),
};

export const forgotPasswordSchema = {
  body: Joi.object({
    email: Joi.string().trim().lowercase().email().max(254).required(),
  }),
};

export const resetPasswordSchema = {
  body: Joi.object({
    email: Joi.string().trim().lowercase().email().max(254).required(),
    code: Joi.string()
      .trim()
      .pattern(/^\d{6}$/)
      .required(),
    password: passwordSchema.required(),
    confirmPassword: Joi.string()
      .valid(Joi.ref("password"))
      .required()
      .messages({ "any.only": "Passwords must match." }),
  }),
};

export const requestEmailVerificationSchema = {
  body: Joi.object({}),
};

export const verifyEmailSchema = {
  body: Joi.object({
    code: Joi.string()
      .trim()
      .pattern(/^\d{6}$/)
      .required(),
  }),
};
