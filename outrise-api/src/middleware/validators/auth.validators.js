import { Joi } from "celebrate";

const passwordSchema = Joi.string().min(8).custom((value, helpers) => {
  if (Buffer.byteLength(value, "utf8") > 72) return helpers.message({ custom: "Password must be no more than 72 UTF-8 bytes." });
  return value;
});

export const registerSchema = {
  body: Joi.object({
    username: Joi.string().trim().min(3).max(30).required(),
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
    code: Joi.string().trim().pattern(/^\d{6}$/).required(),
    password: passwordSchema.required(),
    confirmPassword: Joi.string().valid(Joi.ref("password")).required()
      .messages({ "any.only": "Passwords must match." }),
  }),
};
