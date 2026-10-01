import { Joi } from "celebrate";

export const updateProfileSchema = {
  body: Joi.object({
    firstName: Joi.string().trim().max(50).allow(""),
    lastName: Joi.string().trim().max(50).allow(""),
    nameVisibility: Joi.string().valid("public", "friends", "private"),
    bio: Joi.string().trim().max(250).allow(""),
  }).min(1),
};
