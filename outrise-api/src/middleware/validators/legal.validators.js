import { Joi } from "celebrate";
export const acceptLegalSchema = {
  body: Joi.object({
    accepted: Joi.boolean().valid(true).strict().required(),
    termsVersion: Joi.string().max(50).required(),
    privacyVersion: Joi.string().max(50).required(),
  }),
};
