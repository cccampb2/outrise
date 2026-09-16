import { Joi } from "celebrate";

export const submitFactionAssessmentSchema = {
  body: Joi.object({
    answers: Joi.array().items(Joi.string().required()).min(1).required(),
  }),
};

export const confirmFactionSchema = {
  body: Joi.object({
    factionSlug: Joi.string()
      .trim()
      .valid("helix", "aegis", "nova", "rally")
      .required(),
  }),
};
