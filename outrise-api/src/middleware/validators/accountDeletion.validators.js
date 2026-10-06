import { Joi } from "celebrate";
export const deleteAccountSchema = {
  body: Joi.object({
    password: Joi.string().required(),
    confirmation: Joi.string().valid("DELETE").required(),
  }),
};
