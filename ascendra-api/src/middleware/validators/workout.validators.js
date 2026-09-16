import Joi from "joi";

const workoutTargetSchema = Joi.object({
  sets: Joi.number().integer().min(1),
  reps: Joi.number().integer().min(1),
  weightLbs: Joi.number().min(0),
  distanceMiles: Joi.number().greater(0),
  timeSeconds: Joi.number().integer().greater(0),
});

const workoutExerciseSchema = Joi.object({
  exercise: Joi.string().hex().required(),
  order: Joi.number().integer().min(0).required(),
  target: workoutTargetSchema.required(),
});

export const createWorkoutSchema = {
  body: Joi.object({
    name: Joi.string().trim().min(1).max(100).required(),
    description: Joi.string().trim().max(1000).default(""),
    exercises: Joi.array().items(workoutExerciseSchema).min(1).required(),
    visibility: Joi.string().valid("private", "public").default("private"),
  }),
};

export const getMyWorkoutsSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(10),
    status: Joi.string().valid("active", "archived").default("active"),
  }),
};

export const workoutIdParamSchema = {
  params: Joi.object({
    id: Joi.string().hex().length(24).required(),
  }),
};

export const updateWorkoutSchema = {
  params: Joi.object({ id: Joi.string().hex().length(24).required() }),
  body: Joi.object({
    name: Joi.string().trim().min(1).max(100),
    description: Joi.string().trim().max(1000),
    exercises: Joi.array().items(workoutExerciseSchema).min(1),
    visibility: Joi.string().valid("private", "public"),
  }).min(1),
};
