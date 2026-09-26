import Joi from "joi";

export const startWorkoutSessionSchema = {
  body: Joi.object({
    workoutId: Joi.string().hex().length(24).required(),
  }),
};

export const actualSetSchema = Joi.object({
  order: Joi.number().integer().min(0).required(),
  reps: Joi.number().integer().min(0),
  weightLbs: Joi.number().min(0),
});

export const updateSessionExerciseSchema = {
  params: Joi.object({
    order: Joi.number().integer().min(0).required(),
  }),
  body: Joi.object({
    sets: Joi.array().items(actualSetSchema),
    distanceMiles: Joi.number().min(0),
    timeSeconds: Joi.number().integer().min(0),
    roundsCompleted: Joi.number().integer().min(0),
  }).min(1),
};

export const updateSessionExerciseSkippedSchema = {
  params: Joi.object({
    order: Joi.number().integer().min(0).required(),
  }),
  body: Joi.object({ skipped: Joi.boolean().required() }),
};

export const workoutSessionHistorySchema = {
  query: Joi.object({
    status: Joi.string().valid("completed", "cancelled"),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(20),
  }),
};

export const workoutSessionIdSchema = {
  params: Joi.object({
    id: Joi.string().hex().length(24).required(),
  }),
};

export const repeatWorkoutSessionSchema = {
  params: Joi.object({
    sessionId: Joi.string().hex().length(24).required(),
  }),
};
