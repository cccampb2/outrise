import { Joi } from "celebrate";

export const createExerciseSchema = {
  body: Joi.object({
    name: Joi.string().trim().min(2).max(100).required(),
    slug: Joi.string()
      .trim()
      .lowercase()
      .pattern(/^[a-z0-9-]+$/)
      .required(),
    description: Joi.string().trim().min(10).max(1000).required(),
    category: Joi.string()
      .valid("strength", "cardio", "bodyweight", "mobility")
      .required(),
    muscleGroups: Joi.array().items(Joi.string().trim().min(1)).default([]),
    equipment: Joi.array().items(Joi.string().trim().min(1)).default([]),
    instructions: Joi.array().items(Joi.string().trim().min(1)).default([]),
    videoUrl: Joi.string().trim().uri().allow(null).default(null),
    measurementType: Joi.string()
      .valid(
        "weight_reps",
        "reps",
        "time",
        "distance_time",
        "duration",
        "intervals",
      )
      .required(),
    baseXP: Joi.number().integer().min(5).max(30).required(),
    isActive: Joi.boolean().default(true),
  }),
};

export const getExercisesSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    category: Joi.string().valid(
      "strength",
      "cardio",
      "bodyweight",
      "mobility",
    ),
    muscleGroup: Joi.string().trim().min(1),

    equipment: Joi.string().trim().min(1),

    search: Joi.string().trim().min(1).max(100),
    status: Joi.string().valid("active", "archived", "all"),
  }),
};

export const updateExerciseSchema = {
  params: Joi.object({
    id: Joi.string().hex().length(24).required(),
  }),

  body: Joi.object({
    name: Joi.string().trim().min(2).max(100),
    slug: Joi.string()
      .trim()
      .lowercase()
      .pattern(/^[a-z0-9-]+$/),
    description: Joi.string().trim().min(10).max(1000),
    category: Joi.string().valid(
      "strength",
      "cardio",
      "bodyweight",
      "mobility",
    ),
    muscleGroups: Joi.array().items(Joi.string().trim().min(1)),
    equipment: Joi.array().items(Joi.string().trim().min(1)),
    instructions: Joi.array().items(Joi.string().trim().min(1)),
    videoUrl: Joi.string().trim().uri().allow(null),

    measurementType: Joi.string().valid(
      "weight_reps",
      "reps",
      "time",
      "distance_time",
      "duration",
      "intervals",
    ),

    baseXP: Joi.number().integer().min(5).max(30),
  }).min(1),
};

export const exerciseStatusSchema = {
  params: Joi.object({
    id: Joi.string().hex().length(24).required(),
  }),
};
