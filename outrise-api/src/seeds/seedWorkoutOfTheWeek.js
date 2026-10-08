/**
 * Run manually from outrise-api:
 *   node src/seeds/seedWorkoutOfTheWeek.js --dry-run
 *   node src/seeds/seedWorkoutOfTheWeek.js
 *
 * Dry runs validate against the exercise seed catalog without loading .env or MongoDB.
 * Real runs resolve active exercises from MongoDB, validate every missing template,
 * then insert them in one transaction. Existing templates are preserved by name.
 * New templates are active and eligible for automatic WOTW selection. No weeks are scheduled here.
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
import { fileURLToPath, pathToFileURL } from "node:url";
import Exercise from "../models/Exercise.js";
import WorkoutOfTheWeek from "../models/WorkoutOfTheWeek.js";
import { exerciseCatalog } from "./seedExercises.js";
import { createWorkoutOfTheWeekSchema } from "../middleware/validators/workoutOfTheWeek.validators.js";
import { validateWorkoutTarget } from "../utils/workoutTargetValidation.js";

const reps = (name, sets, count) => ({ name, target: { sets, reps: count } });
const hold = (name, seconds) => ({ name, target: { timeSeconds: seconds } });
const distance = (name, miles) => ({ name, target: { distanceMiles: miles } });

export const wotwCatalog = [
  {
    name: "First Ascent",
    difficulty: "easy",
    bonusXP: 75,
    description:
      "A simple full-body week. Rest between sets and prioritize controlled form.",
    exercises: [
      reps("Bodyweight Squat", 2, 10),
      reps("Push-Up", 2, 5),
      reps("Glute Bridge", 2, 12),
      hold("Forearm Plank", 20),
    ],
  },
  {
    name: "Core Control",
    difficulty: "easy",
    bonusXP: 75,
    description:
      "Build control through the trunk. Count each alternating side as one rep; use the same convention throughout.",
    exercises: [
      reps("Dead Bug", 3, 10),
      reps("Bicycle Crunch", 3, 16),
      hold("Forearm Plank", 30),
      hold("Superman Hold", 20),
    ],
  },
  {
    name: "Leg Day, Anywhere",
    difficulty: "medium",
    bonusXP: 125,
    description:
      "A lower-body challenge without equipment. Walking lunge reps are total steps across both legs.",
    exercises: [
      reps("Bodyweight Squat", 4, 15),
      reps("Walking Lunge", 3, 20),
      reps("Glute Bridge", 3, 20),
      hold("Forearm Plank", 45),
    ],
  },
  {
    name: "Push the Pace",
    difficulty: "medium",
    bonusXP: 125,
    description:
      "Combine push-ups, leg work, and cardio. Rest as needed between sets.",
    exercises: [
      reps("Push-Up", 4, 10),
      reps("Bodyweight Squat", 3, 20),
      hold("Jumping Jacks", 90),
      hold("Forearm Plank", 45),
    ],
  },
  {
    name: "Take It Outside",
    difficulty: "easy",
    bonusXP: 100,
    description:
      "Walk a mile, then complete a short bodyweight session. Lunge reps count total steps.",
    exercises: [
      distance("Walking", 1),
      reps("Bodyweight Squat", 2, 15),
      reps("Walking Lunge", 2, 12),
      reps("Glute Bridge", 2, 15),
    ],
  },
  {
    name: "Run and Rise",
    difficulty: "medium",
    bonusXP: 150,
    description:
      "A one-mile run followed by strength work. Finish at a sustainable pace; no target running time is required.",
    exercises: [
      distance("Running", 1),
      reps("Bodyweight Squat", 3, 15),
      reps("Push-Up", 3, 8),
      hold("Forearm Plank", 45),
    ],
  },
  {
    name: "Engine Room",
    difficulty: "hard",
    bonusXP: 200,
    description:
      "A demanding bodyweight conditioning session. Cardio targets are total working time, with breaks as needed.",
    exercises: [
      reps("Burpee", 4, 10),
      hold("Mountain Climbers", 120),
      hold("Jumping Jacks", 150),
      reps("Bodyweight Squat", 4, 20),
    ],
  },
  {
    name: "The Hundred Club",
    difficulty: "hard",
    bonusXP: 225,
    description:
      "Complete 100 squats and 50 push-ups across the prescribed sets, plus two minutes of jumping jacks. Rest between sets.",
    exercises: [
      reps("Bodyweight Squat", 5, 20),
      hold("Jumping Jacks", 120),
      reps("Push-Up", 5, 10),
      hold("Forearm Plank", 60),
    ],
  },
  {
    name: "Distance and Discipline",
    difficulty: "hard",
    bonusXP: 250,
    description:
      "A two-mile run plus a full-body finish. Walking lunge reps count total steps across both legs.",
    exercises: [
      distance("Running", 2),
      reps("Walking Lunge", 3, 24),
      reps("Push-Up", 4, 12),
      reps("Glute Bridge", 3, 20),
      hold("Forearm Plank", 60),
    ],
  },
  {
    name: "Living Room Rivalry",
    difficulty: "just_fun",
    bonusXP: 100,
    description:
      "A quick equipment-free challenge. Cardio targets are total working time. Keep movements controlled and take breaks as needed.",
    exercises: [
      hold("Jumping Jacks", 60),
      reps("Bodyweight Squat", 3, 12),
      hold("Mountain Climbers", 60),
      reps("Bicycle Crunch", 3, 16),
    ],
  },
];

export function buildWotwTemplate(template, exerciseMap) {
  const { exercises, ...fields } = template;
  const payload = {
    ...fields,
    exercises: exercises.map((entry, order) => {
      const exercise = exerciseMap.get(entry.name);
      if (!exercise || exercise.isActive === false)
        throw new Error(
          `${template.name}: active exercise "${entry.name}" not found. Seed or restore that exercise first.`,
        );
      validateWorkoutTarget({
        measurementType: exercise.measurementType,
        target: entry.target,
        exerciseName: entry.name,
      });
      return {
        exercise: String(exercise._id),
        order,
        target: { ...entry.target },
      };
    }),
  };
  const { error, value } = createWorkoutOfTheWeekSchema.body.validate(payload);
  if (error) throw new Error(`${template.name}: ${error.message}`);
  return value;
}

export async function seedWorkoutOfTheWeek({ dryRun = false } = {}) {
  if (dryRun) {
    const exerciseMap = new Map(
      exerciseCatalog.map((entry) => [
        entry.name,
        { ...entry, _id: new mongoose.Types.ObjectId() },
      ]),
    );
    for (const template of wotwCatalog) {
      const payload = buildWotwTemplate(template, exerciseMap);
      await new WorkoutOfTheWeek(payload).validate();
      console.log(
        `${template.name} · ${template.difficulty} · ${template.bonusXP} bonus XP · ${template.exercises.length} exercises`,
      );
    }
    console.log(
      "Validated 10 templates against the exercise catalog. No database connection or writes. Actual database exercises are checked during seeding.",
    );
    return;
  }
  dotenv.config({
    path: fileURLToPath(new URL("../../.env", import.meta.url)),
    quiet: true,
  });
  if (!process.env.MONGO_URI?.trim())
    throw new Error(
      "Set MONGO_URI in outrise-api/.env or your environment before seeding.",
    );
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 15000,
    });
    const session = await mongoose.startSession();
    try {
      const result = await session.withTransaction(async () => {
        const existing = await WorkoutOfTheWeek.find({})
          .select("name")
          .session(session)
          .lean();
        const names = new Set(
          existing.map((entry) => entry.name.trim().toLowerCase()),
        );
        const missing = wotwCatalog.filter(
          (entry) => !names.has(entry.name.toLowerCase()),
        );
        const needed = [
          ...new Set(
            missing.flatMap((entry) =>
              entry.exercises.map((exercise) => exercise.name),
            ),
          ),
        ];
        const exercises = await Exercise.find({
          name: { $in: needed },
          isActive: true,
        })
          .session(session)
          .lean();
        const exerciseMap = new Map(
          exercises.map((entry) => [entry.name, entry]),
        );
        const payloads = missing.map((entry) =>
          buildWotwTemplate(entry, exerciseMap),
        );
        // Validate every document before writing any template.
        for (const payload of payloads)
          await new WorkoutOfTheWeek(payload).validate();
        if (payloads.length)
          await WorkoutOfTheWeek.create(payloads, { session, ordered: true });
        return {
          inserted: payloads.length,
          preserved: wotwCatalog.length - missing.length,
        };
      });
      console.log(
        `Inserted ${result.inserted} WOTW templates; preserved ${result.preserved} existing templates. No weeks scheduled. New templates are active and eligible for automatic selection.`,
      );
    } finally {
      await session.endSession();
    }
  } finally {
    await mongoose.disconnect();
  }
}

export function describeSeedError(error) {
  if (
    error?.message ===
    "Set MONGO_URI in outrise-api/.env or your environment before seeding."
  )
    return error.message;
  if (error?.code === 18 || error?.codeName === "AuthenticationFailed")
    return "MongoDB rejected the database username or password.";
  if (error?.code === 20)
    return "MongoDB transactions require a replica set, such as your Atlas cluster.";
  if (error?.code === 11000)
    return "MongoDB rejected a duplicate entry. Existing templates were not overwritten.";
  if (
    [
      "MongooseServerSelectionError",
      "MongoServerSelectionError",
      "MongoNetworkError",
      "MongoNetworkTimeoutError",
    ].includes(error?.name)
  )
    return "Could not reach MongoDB. Check MONGO_URI, Atlas network access, and your internet connection.";
  if (error?.name === "ValidationError")
    return `Template validation failed for: ${Object.keys(error.errors ?? {}).join(", ")}.`;
  // Catalog and target errors name only known templates/exercises, never connection details.
  const safePrefix =
    wotwCatalog.some((template) =>
      error?.message?.startsWith(`${template.name}:`),
    ) ||
    exerciseCatalog.some(
      (exercise) =>
        error?.message ===
          `${exercise.name} has an unsupported measurement type` ||
        error?.message?.endsWith(` is not valid for ${exercise.name}`) ||
        error?.message?.startsWith(`${exercise.name} requires `),
    );
  if (safePrefix) return error.message;
  return `Unexpected failure (${error?.name ?? "Error"}${typeof error?.code === "number" ? `, code ${error.code}` : ""}). Database credentials and connection details are hidden.`;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const args = process.argv.slice(2);
  if (args.includes("--help"))
    console.log("Usage: node src/seeds/seedWorkoutOfTheWeek.js [--dry-run]");
  else if (args.some((arg) => arg !== "--dry-run")) {
    console.error("Unknown argument. Use --help or --dry-run.");
    process.exitCode = 1;
  } else
    seedWorkoutOfTheWeek({ dryRun: args.includes("--dry-run") }).catch(
      (error) => {
        console.error(`WOTW seeding failed: ${describeSeedError(error)}`);
        process.exitCode = 1;
      },
    );
}
