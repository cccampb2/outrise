import { createActivityEvent } from "./activity.service.js";
import WorkoutOfTheWeek from "../models/WorkoutOfTheWeek.js";
import WorkoutOfTheWeekOccurrence from "../models/WorkoutOfTheWeekOccurrence.js";
import NotFoundError from "../errors/NotFoundError.js";
import ConflictError from "../errors/ConflictError.js";
import NoEligibleWorkoutOfTheWeekError from "../errors/NoEligibleWorkoutOfTheWeekError.js";
import Exercise from "../models/Exercise.js";
import { validateWorkoutTarget } from "../utils/workoutTargetValidation.js";
import {
  getWorkoutOfTheWeekWindow,
  getCurrentWorkoutOfTheWeekWindow,
} from "../utils/workoutOfTheWeekDates.js";

import WorkoutSession from "../models/WorkoutSession.js";

const validateWorkoutOfTheWeekExercises = async (exercises) => {
  const exerciseIds = exercises.map(
    (workoutExercise) => workoutExercise.exercise,
  );

  const uniqueExerciseIds = new Set(
    exerciseIds.map((exerciseId) => exerciseId.toString()),
  );

  const exerciseDocuments = await Exercise.find({
    _id: {
      $in: exerciseIds,
    },
    isActive: true,
  });

  if (exerciseDocuments.length !== uniqueExerciseIds.size) {
    throw new NotFoundError("One or more exercises were not found");
  }

  const exerciseMap = new Map(
    exerciseDocuments.map((exercise) => [exercise._id.toString(), exercise]),
  );

  exercises.forEach((workoutExercise) => {
    const exercise = exerciseMap.get(workoutExercise.exercise.toString());

    validateWorkoutTarget({
      measurementType: exercise.measurementType,
      target: workoutExercise.target,
      exerciseName: exercise.name,
    });
  });
};

const hasWorkoutOfTheWeekChanges = (workoutOfTheWeek, updates) => {
  if (updates.name !== undefined && updates.name !== workoutOfTheWeek.name) {
    return true;
  }

  if (
    updates.description !== undefined &&
    updates.description !== workoutOfTheWeek.description
  ) {
    return true;
  }

  if (
    updates.bonusXP !== undefined &&
    updates.bonusXP !== workoutOfTheWeek.bonusXP
  ) {
    return true;
  }

  if (
    updates.difficulty !== undefined &&
    updates.difficulty !== workoutOfTheWeek.difficulty
  ) {
    return true;
  }

  if (updates.exercises !== undefined) {
    const currentExercises = workoutOfTheWeek.exercises.map(
      (workoutExercise) => ({
        exercise: workoutExercise.exercise.toString(),

        order: workoutExercise.order,

        target: workoutExercise.target.toObject(),
      }),
    );

    const updatedExercises = updates.exercises.map((workoutExercise) => ({
      exercise: workoutExercise.exercise.toString(),

      order: workoutExercise.order,

      target: workoutExercise.target,
    }));

    if (JSON.stringify(currentExercises) !== JSON.stringify(updatedExercises)) {
      return true;
    }
  }

  // Nothing in the request changed the template.
  return false;
};

const getRandomEligibleWorkoutOfTheWeek = async ({ weekStart, weekEnd }) => {
  const previousOccurrence = await WorkoutOfTheWeekOccurrence.findOne({
    endsAt: weekStart,
  });

  const nextOccurrence = await WorkoutOfTheWeekOccurrence.findOne({
    startsAt: weekEnd,
  });

  const excludedTemplateIds = [];

  if (previousOccurrence) {
    excludedTemplateIds.push(previousOccurrence.workoutOfTheWeek);
  }

  if (nextOccurrence) {
    excludedTemplateIds.push(nextOccurrence.workoutOfTheWeek);
  }

  const eligibleTemplates = await WorkoutOfTheWeek.find({
    isActive: true,
    _id: {
      $nin: excludedTemplateIds,
    },
  });

  if (eligibleTemplates.length === 0) {
    throw new NoEligibleWorkoutOfTheWeekError();
  }

  const randomIndex = Math.floor(Math.random() * eligibleTemplates.length);

  return eligibleTemplates[randomIndex];
};

const createWorkoutOfTheWeekOccurrenceFromTemplate = async ({
  workoutOfTheWeek,
  weekStart,
  weekEnd,
  selectionSource,
  selectedBy = null,
}) => {
  const exercises = workoutOfTheWeek.exercises.map((workoutExercise) => {
    const exercise = workoutExercise.exercise;

    return {
      exercise: exercise._id,
      exerciseName: exercise.name,
      measurementType: exercise.measurementType,
      order: workoutExercise.order,
      target: workoutExercise.target.toObject(),
    };
  });

  const occurrence = await WorkoutOfTheWeekOccurrence.create({
    workoutOfTheWeek: workoutOfTheWeek._id,
    name: workoutOfTheWeek.name,
    description: workoutOfTheWeek.description,
    bonusXP: workoutOfTheWeek.bonusXP,
    difficulty: workoutOfTheWeek.difficulty,
    startsAt: weekStart,
    endsAt: weekEnd,
    status: "upcoming",
    exercises,
    selectionSource,
    selectedBy,
  });

  return occurrence;
};

export const getCurrentWorkoutOfTheWeekOccurrence = async () => {
  const { weekStart, weekEnd } = getCurrentWorkoutOfTheWeekWindow();
  const occurrence = await WorkoutOfTheWeekOccurrence.findOne({
    startsAt: weekStart,
    endsAt: weekEnd,
  });

  return occurrence;
};

export const createWorkoutOfTheWeekOccurrence = async ({
  workoutOfTheWeekId,
  startDate,

  selectionSource,
  selectedBy = null,
}) => {
  const { weekStart, weekEnd } = getWorkoutOfTheWeekWindow(startDate);

  const conflictingOccurrence = await WorkoutOfTheWeekOccurrence.findOne({
    startsAt: {
      $lt: weekEnd,
    },
    endsAt: {
      $gt: weekStart,
    },
  });

  if (conflictingOccurrence) {
    throw new ConflictError(
      "A Workout of the Week is already scheduled during this time",
    );
  }

  const previousOccurrence = await WorkoutOfTheWeekOccurrence.findOne({
    endsAt: weekStart,
  });

  if (
    previousOccurrence &&
    previousOccurrence.workoutOfTheWeek.toString() ===
      workoutOfTheWeekId.toString()
  ) {
    throw new ConflictError(
      "This Workout of the Week cannot be scheduled because the previous week uses the same WOTW template.",
    );
  }

  const nextOccurrence = await WorkoutOfTheWeekOccurrence.findOne({
    startsAt: weekEnd,
  });

  if (
    nextOccurrence &&
    nextOccurrence.workoutOfTheWeek.toString() === workoutOfTheWeekId.toString()
  ) {
    throw new ConflictError(
      "This Workout of the Week cannot be scheduled because the following week uses the same WOTW template.",
    );
  }

  const workoutOfTheWeek = await WorkoutOfTheWeek.findOne({
    _id: workoutOfTheWeekId,
    isActive: true,
  }).populate("exercises.exercise");

  if (!workoutOfTheWeek) {
    throw new NotFoundError("Workout of the Week not found");
  }

  const occurrence = await createWorkoutOfTheWeekOccurrenceFromTemplate({
    workoutOfTheWeek,
    weekStart,
    weekEnd,
    selectionSource,
    selectedBy,
  });

  return occurrence;
};

export const createWorkoutOfTheWeek = async ({
  name,
  description,
  bonusXP,
  difficulty,
  exercises,
  createdBy,
}) => {
  await validateWorkoutOfTheWeekExercises(exercises);

  const workoutOfTheWeek = await WorkoutOfTheWeek.create({
    name,
    description,
    bonusXP,
    difficulty,
    exercises,
    createdBy,
  });

  return workoutOfTheWeek;
};

export const getWorkoutOfTheWeekTemplates = async ({
  page = 1,
  limit = 10,
  status = "active",
}) => {
  const skip = (page - 1) * limit;

  const isActive = status === "active";

  const filter = {
    isActive,
  };

  const workoutOfTheWeekTemplates = await WorkoutOfTheWeek.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate("exercises.exercise", "name slug category measurementType")
    .populate("createdBy", "username");

  const totalTemplates = await WorkoutOfTheWeek.countDocuments(filter);

  const totalPages = Math.ceil(totalTemplates / limit);

  return {
    workoutOfTheWeekTemplates,
    pagination: {
      page,
      limit,
      totalTemplates,
      totalPages,
    },
  };
};

export const getWorkoutOfTheWeekById = async ({ workoutOfTheWeekId }) => {
  const workoutOfTheWeek = await WorkoutOfTheWeek.findOne({
    _id: workoutOfTheWeekId,
    isActive: true,
  })
    .populate(
      "exercises.exercise",
      "name slug description category muscleGroups equipment instructions videoUrl measurementType",
    )
    .populate("createdBy", "username");

  if (!workoutOfTheWeek) {
    throw new NotFoundError("Workout of the Week not found");
  }

  return workoutOfTheWeek;
};

export const updateWorkoutOfTheWeek = async ({
  workoutOfTheWeekId,
  updates,
}) => {
  const workoutOfTheWeek = await WorkoutOfTheWeek.findOne({
    _id: workoutOfTheWeekId,
    isActive: true,
  });

  if (!workoutOfTheWeek) {
    throw new NotFoundError("Workout of the Week not found");
  }

  if (updates.exercises !== undefined) {
    await validateWorkoutOfTheWeekExercises(updates.exercises);
  }

  const hasChanges = hasWorkoutOfTheWeekChanges(workoutOfTheWeek, updates);

  if (!hasChanges) {
    return {
      workoutOfTheWeek,
      createdNewTemplate: false,
    };
  }

  const existingOccurrence = await WorkoutOfTheWeekOccurrence.exists({
    workoutOfTheWeek: workoutOfTheWeekId,
  });

  if (!existingOccurrence) {
    Object.assign(workoutOfTheWeek, updates);
    await workoutOfTheWeek.save();
    await workoutOfTheWeek.populate(
      "exercises.exercise",
      "name slug category measurementType",
    );

    await workoutOfTheWeek.populate("createdBy", "username");
    return { workoutOfTheWeek, createdNewTemplate: false };
  }

  const existingExercises = workoutOfTheWeek.exercises.map(
    (workoutExercise) => ({
      exercise: workoutExercise.exercise,
      order: workoutExercise.order,
      target: workoutExercise.target.toObject(),
    }),
  );

  const newWorkOfTheWeek = await WorkoutOfTheWeek.create({
    name: updates.name ?? workoutOfTheWeek.name,
    description: updates.description ?? workoutOfTheWeek.description,

    bonusXP: updates.bonusXP ?? workoutOfTheWeek.bonusXP,
    difficulty: updates.difficulty ?? workoutOfTheWeek.difficulty,

    exercises: updates.exercises ?? existingExercises,

    createdBy: workoutOfTheWeek.createdBy,
  });

  await newWorkOfTheWeek.populate(
    "exercises.exercise",
    "name slug category measurementType",
  );

  await newWorkOfTheWeek.populate("createdBy", "username");

  return { workoutOfTheWeek: newWorkOfTheWeek, createdNewTemplate: true };
};

export const archiveWorkoutOfTheWeek = async ({ workoutOfTheWeekId }) => {
  const workoutOfTheWeek = await WorkoutOfTheWeek.findOne({
    _id: workoutOfTheWeekId,
    isActive: true,
  });

  if (!workoutOfTheWeek) {
    throw new NotFoundError("Workout of the Week not found");
  }

  workoutOfTheWeek.isActive = false;
  await workoutOfTheWeek.save();

  return workoutOfTheWeek;
};

export const restoreWorkoutOfTheWeek = async ({ workoutOfTheWeekId }) => {
  const workoutOfTheWeek = await WorkoutOfTheWeek.findOne({
    _id: workoutOfTheWeekId,
    isActive: false,
  });

  if (!workoutOfTheWeek) {
    throw new NotFoundError("Workout of the Week not found");
  }

  workoutOfTheWeek.isActive = true;
  await workoutOfTheWeek.save();

  return workoutOfTheWeek;
};

export const getActiveWorkoutOfTheWeekOccurrence = async () => {
  const occurrence = await WorkoutOfTheWeekOccurrence.findOne({
    status: "active",
  });

  if (!occurrence) {
    return null;
  }

  await occurrence.populate("workoutOfTheWeek", "name");

  return occurrence;
};

export const reconcileWorkoutOfTheWeekOccurrences = async () => {
  const now = new Date();

  await WorkoutOfTheWeekOccurrence.updateMany(
    {
      status: "active",
      endsAt: {
        $lte: now,
      },
    },
    {
      $set: {
        status: "completed",
      },
    },
  );

  await ensureCurrentWorkoutOfTheWeekOccurrence();

  const occurrenceToActivate = await WorkoutOfTheWeekOccurrence.findOne({
    status: "upcoming",
    startsAt: {
      $lte: now,
    },
    endsAt: {
      $gt: now,
    },
  }).sort({ startsAt: 1 });

  if (occurrenceToActivate) {
    occurrenceToActivate.status = "active";
    await occurrenceToActivate.save();
  }
  // Reconcile the event too, so a failed write after activation is retried next run.
  const activeOccurrence = occurrenceToActivate ?? await WorkoutOfTheWeekOccurrence.findOne({ status: "active", startsAt: { $lte: now }, endsAt: { $gt: now } });
  if (activeOccurrence) {
    await createActivityEvent({
      type: "wotw_launched", audience: "global",
      sourceType: "workout_of_the_week_occurrence", sourceId: activeOccurrence._id,
      details: { workoutName: activeOccurrence.name }, occurredAt: activeOccurrence.startsAt,
      idempotencyKey: `wotw:${activeOccurrence._id}:launched`,
    });
  }
  return occurrenceToActivate;
};

export const ensureCurrentWorkoutOfTheWeekOccurrence = async () => {
  const { weekStart, weekEnd } = getCurrentWorkoutOfTheWeekWindow();

  const existingOccurrence = await WorkoutOfTheWeekOccurrence.findOne({
    startsAt: weekStart,
    endsAt: weekEnd,
  });

  if (existingOccurrence) {
    return existingOccurrence;
  }
  const workoutOfTheWeek = await getRandomEligibleWorkoutOfTheWeek({
    weekStart,
    weekEnd,
  });

  await workoutOfTheWeek.populate("exercises.exercise");

  try {
    const occurrence = await createWorkoutOfTheWeekOccurrenceFromTemplate({
      workoutOfTheWeek,
      weekStart,
      weekEnd,

      selectionSource: "random",

      selectedBy: null,
    });

    return occurrence;
  } catch (error) {
    if (error.code === 11000 && error.keyPattern?.startsAt) {
      const occurrence = await WorkoutOfTheWeekOccurrence.findOne({
        startsAt: weekStart,
        endsAt: weekEnd,
      });

      return occurrence;
    }

    throw error;
  }
};

export const getCurrentWorkoutOfTheWeekForUser = async (userId) => {
  const occurrence = await getActiveWorkoutOfTheWeekOccurrence();

  if (!occurrence) {
    return null;
  }

  const workoutSession = await WorkoutSession.findOne({
    user: userId,
    workoutOfTheWeekOccurrence: occurrence._id,
    sourceType: "workout_of_the_week",
  });

  return {
    occurrence,
    workoutSession,
  };
};

export const getWorkoutOfTheWeekHistory = async ({
  userId,
  page = 1,
  limit = 10,
}) => {
  const skip = (page - 1) * limit;

  const filter = {
    status: "completed",
  };

  const occurrences = await WorkoutOfTheWeekOccurrence.find(filter)
    .sort({ startsAt: -1 })
    .skip(skip)
    .limit(limit);

  const occurrenceIds = occurrences.map((occurrence) => occurrence._id);

  const workoutSessions = await WorkoutSession.find({
    user: userId,
    workoutOfTheWeekOccurrence: {
      $in: occurrenceIds,
    },
    sourceType: "workout_of_the_week",
  });

  const workoutSessionMap = new Map(
    workoutSessions.map((workoutSession) => [
      workoutSession.workoutOfTheWeekOccurrence.toString(),
      workoutSession,
    ]),
  );

  const history = occurrences.map((occurrence) => {
    const workoutSession =
      workoutSessionMap.get(occurrence._id.toString()) ?? null;

    return {
      occurrence,
      workoutSession,
    };
  });

  const totalOccurrences =
    await WorkoutOfTheWeekOccurrence.countDocuments(filter);

  const totalPages = Math.ceil(totalOccurrences / limit);

  return {
    history,
    pagination: {
      page,
      limit,
      totalOccurrences,
      totalPages,
    },
  };
};
