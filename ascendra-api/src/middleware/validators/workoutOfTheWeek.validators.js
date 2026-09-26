import { Joi } from "celebrate";

export const createWorkoutOfTheWeekSchema = {
  body: Joi.object({
    name: Joi.string().trim().required(),
    description: Joi.string().trim().allow("").default(""),
    bonusXP: Joi.number().integer().min(1).required(),
    exercises: Joi.array()
      .items(
        Joi.object({
          exercise: Joi.string().hex().length(24).required(),
          order: Joi.number().integer().min(0).required(),
          target: Joi.object({
            sets: Joi.number().integer().min(1),
            reps: Joi.number().integer().min(1),
            weightLbs: Joi.number().min(0),
            distanceMiles: Joi.number().min(0),
            timeSeconds: Joi.number().min(0),
            workSeconds: Joi.number().integer().greater(0),
            recoverySeconds: Joi.number().integer().min(0),
            rounds: Joi.number().integer().min(1),
          }).required(),
        }),
      )
      .min(1)
      .required(),
  }),
};

export const getWorkoutOfTheWeekTemplatesSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),

    limit: Joi.number().integer().min(1).max(100).default(10),

    status: Joi.string().valid("active", "archived").default("active"),
  }),
};

export const workoutOfTheWeekIdSchema = {
  params: Joi.object({
    workoutOfTheWeekId: Joi.string().hex().length(24).required(),
  }),
};
export const updateWorkoutOfTheWeekSchema = {
  params: Joi.object({
    workoutOfTheWeekId: Joi.string()

      .hex()

      .length(24)

      .required(),
  }),

  body: Joi.object({
    name: Joi.string()

      .trim(),

    description: Joi.string()

      .trim()

      .allow(""),

    bonusXP: Joi.number()

      .integer()

      .min(1),

    exercises: Joi.array()

      .min(1)

      .items(
        Joi.object({
          exercise: Joi.string()

            .hex()

            .length(24)

            .required(),

          order: Joi.number()

            .integer()

            .min(0)

            .required(),

          target: Joi.object({
            sets: Joi.number().integer().min(1),

            reps: Joi.number().integer().min(1),

            weightLbs: Joi.number().min(0),

            distanceMiles: Joi.number().min(0),

            timeSeconds: Joi.number().min(0),
            workSeconds: Joi.number().integer().greater(0),
            recoverySeconds: Joi.number().integer().min(0),
            rounds: Joi.number().integer().min(1),
          }).required(),
        }),
      ),
  })

    .min(1),
};

export const createWorkoutOfTheWeekOccurrenceSchema = {
  body: Joi.object({
    workoutOfTheWeekId: Joi.string().hex().length(24).required(),
    startDate: Joi.string()
      .pattern(/^\d{4}-\d{2}-\d{2}$/)
      .required(),
  }),
};

export const getWorkoutOfTheWeekHistorySchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
  }),
};
