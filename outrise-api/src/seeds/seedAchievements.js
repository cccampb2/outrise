/**
 * Run manually from outrise-api:
 *   node src/seeds/seedAchievements.js --dry-run
 *   node src/seeds/seedAchievements.js
 *
 * Dry runs validate the catalog without loading .env or connecting to MongoDB.
 * Seeding inserts missing achievements and leaves existing entries unchanged.
 * Verified performances need an active exercise with the matching logging type.
 * This file is not imported by API startup and does not award achievements or XP.
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
import { fileURLToPath, pathToFileURL } from "node:url";
import Achievement from "../models/Achievement.js";
import Exercise from "../models/Exercise.js";
import { achievementCreateSchema } from "../middleware/validators/adminAchievement.validators.js";

export const achievementCatalog = [
  {
    name: "First Step",
    description: "Complete 1 workout.",
    category: "workout",
    requirementType: "workout_count",
    requirement: {
      value: 1,
    },
    xpReward: 25,
  },
  {
    name: "Finding Your Feet",
    description: "Complete 5 workouts.",
    category: "workout",
    requirementType: "workout_count",
    requirement: {
      value: 5,
    },
    xpReward: 50,
  },
  {
    name: "Getting Into It",
    description: "Complete 10 workouts.",
    category: "workout",
    requirementType: "workout_count",
    requirement: {
      value: 10,
    },
    xpReward: 100,
  },
  {
    name: "Building Momentum",
    description: "Complete 25 workouts.",
    category: "workout",
    requirementType: "workout_count",
    requirement: {
      value: 25,
    },
    xpReward: 150,
  },
  {
    name: "Showing Up",
    description: "Complete 50 workouts.",
    category: "workout",
    requirementType: "workout_count",
    requirement: {
      value: 50,
    },
    xpReward: 250,
  },
  {
    name: "Century Club",
    description: "Complete 100 workouts.",
    category: "workout",
    requirementType: "workout_count",
    requirement: {
      value: 100,
    },
    xpReward: 500,
  },
  {
    name: "Part of the Routine",
    description: "Complete 250 workouts.",
    category: "workout",
    requirementType: "workout_count",
    requirement: {
      value: 250,
    },
    xpReward: 1000,
  },
  {
    name: "Built Different",
    description: "Complete 500 workouts.",
    category: "workout",
    requirementType: "workout_count",
    requirement: {
      value: 500,
    },
    xpReward: 2000,
  },
  {
    name: "A Thousand Reasons",
    description: "Complete 1,000 workouts.",
    category: "workout",
    requirementType: "workout_count",
    requirement: {
      value: 1000,
    },
    xpReward: 5000,
  },
  {
    name: "On the Rise",
    description: "Reach level 5.",
    category: "progression",
    requirementType: "level_reached",
    requirement: {
      value: 5,
    },
    xpReward: 25,
  },
  {
    name: "Double Digits",
    description: "Reach level 10.",
    category: "progression",
    requirementType: "level_reached",
    requirement: {
      value: 10,
    },
    xpReward: 50,
  },
  {
    name: "Picking Up Speed",
    description: "Reach level 25.",
    category: "progression",
    requirementType: "level_reached",
    requirement: {
      value: 25,
    },
    xpReward: 100,
  },
  {
    name: "Higher Ground",
    description: "Reach level 50.",
    category: "progression",
    requirementType: "level_reached",
    requirement: {
      value: 50,
    },
    xpReward: 150,
  },
  {
    name: "Triple Digits",
    description: "Reach level 100.",
    category: "progression",
    requirementType: "level_reached",
    requirement: {
      value: 100,
    },
    xpReward: 250,
  },
  {
    name: "Beyond the Beginning",
    description: "Reach level 200.",
    category: "progression",
    requirementType: "level_reached",
    requirement: {
      value: 200,
    },
    xpReward: 500,
  },
  {
    name: "Five Hundred Strong",
    description: "Reach level 500.",
    category: "progression",
    requirementType: "level_reached",
    requirement: {
      value: 500,
    },
    xpReward: 1500,
  },
  {
    name: "Four Digits, Zero Excuses",
    description: "Reach level 1,000.",
    category: "progression",
    requirementType: "level_reached",
    requirement: {
      value: 1000,
    },
    xpReward: 5000,
  },
  {
    name: "Echelon I: The Beginning",
    description: "Reach Echelon I at level 50.",
    category: "echelon",
    requirementType: "echelon_reached",
    requirement: {
      value: 1,
    },
    xpReward: 100,
  },
  {
    name: "Echelon II: Momentum",
    description: "Reach Echelon II at level 100.",
    category: "echelon",
    requirementType: "echelon_reached",
    requirement: {
      value: 2,
    },
    xpReward: 150,
  },
  {
    name: "Echelon III: Resolve",
    description: "Reach Echelon III at level 150.",
    category: "echelon",
    requirementType: "echelon_reached",
    requirement: {
      value: 3,
    },
    xpReward: 200,
  },
  {
    name: "Echelon IV: Persistence",
    description: "Reach Echelon IV at level 200.",
    category: "echelon",
    requirementType: "echelon_reached",
    requirement: {
      value: 4,
    },
    xpReward: 250,
  },
  {
    name: "Echelon V: Unshaken",
    description: "Reach Echelon V at level 250.",
    category: "echelon",
    requirementType: "echelon_reached",
    requirement: {
      value: 5,
    },
    xpReward: 300,
  },
  {
    name: "Echelon VI: Relentless",
    description: "Reach Echelon VI at level 300.",
    category: "echelon",
    requirementType: "echelon_reached",
    requirement: {
      value: 6,
    },
    xpReward: 400,
  },
  {
    name: "Echelon VII: Ascending",
    description: "Reach Echelon VII at level 350.",
    category: "echelon",
    requirementType: "echelon_reached",
    requirement: {
      value: 7,
    },
    xpReward: 500,
  },
  {
    name: "Echelon VIII: Exceptional",
    description: "Reach Echelon VIII at level 400.",
    category: "echelon",
    requirementType: "echelon_reached",
    requirement: {
      value: 8,
    },
    xpReward: 750,
  },
  {
    name: "Echelon IX: Formidable",
    description: "Reach Echelon IX at level 450.",
    category: "echelon",
    requirementType: "echelon_reached",
    requirement: {
      value: 9,
    },
    xpReward: 1000,
  },
  {
    name: "Echelon X: Outrise",
    description: "Reach Echelon X at level 500.",
    category: "echelon",
    requirementType: "echelon_reached",
    requirement: {
      value: 10,
    },
    xpReward: 1500,
  },
  {
    name: "Your First Benchmark",
    description: "Hold 1 separate tracked personal record.",
    category: "personal_record",
    requirementType: "personal_record_count",
    requirement: {
      value: 1,
    },
    xpReward: 25,
  },
  {
    name: "Raising the Bar",
    description: "Hold 5 separate tracked personal records.",
    category: "personal_record",
    requirementType: "personal_record_count",
    requirement: {
      value: 5,
    },
    xpReward: 100,
  },
  {
    name: "Breaking New Ground",
    description: "Hold 10 separate tracked personal records.",
    category: "personal_record",
    requirementType: "personal_record_count",
    requirement: {
      value: 10,
    },
    xpReward: 150,
  },
  {
    name: "Record Collection",
    description: "Hold 25 separate tracked personal records.",
    category: "personal_record",
    requirementType: "personal_record_count",
    requirement: {
      value: 25,
    },
    xpReward: 300,
  },
  {
    name: "The Record Keeper",
    description: "Hold 50 separate tracked personal records.",
    category: "personal_record",
    requirementType: "personal_record_count",
    requirement: {
      value: 50,
    },
    xpReward: 500,
  },
  {
    name: "Receipts Included",
    description: "Get 1 performance approved.",
    category: "verification",
    requirementType: "verification_count",
    requirement: {
      value: 1,
    },
    xpReward: 50,
  },
  {
    name: "Backed by Proof",
    description: "Get 5 performances approved.",
    category: "verification",
    requirementType: "verification_count",
    requirement: {
      value: 5,
    },
    xpReward: 100,
  },
  {
    name: "Verified Regular",
    description: "Get 10 performances approved.",
    category: "verification",
    requirementType: "verification_count",
    requirement: {
      value: 10,
    },
    xpReward: 200,
  },
  {
    name: "Beyond Doubt",
    description: "Get 25 performances approved.",
    category: "verification",
    requirementType: "verification_count",
    requirement: {
      value: 25,
    },
    xpReward: 500,
  },
  {
    name: "The Evidence Is Clear",
    description: "Get 50 performances approved.",
    category: "verification",
    requirementType: "verification_count",
    requirement: {
      value: 50,
    },
    xpReward: 1000,
  },
  {
    name: "Challenge Accepted",
    description: "Complete 1 Workout of the Week attempt.",
    category: "workout_of_the_week",
    requirementType: "wotw_count",
    requirement: {
      value: 1,
    },
    xpReward: 50,
  },
  {
    name: "Coming Back for More",
    description: "Complete 5 Workout of the Week attempts, including repeats.",
    category: "workout_of_the_week",
    requirementType: "wotw_count",
    requirement: {
      value: 5,
    },
    xpReward: 100,
  },
  {
    name: "Weekly Warrior",
    description: "Complete 10 Workout of the Week attempts, including repeats.",
    category: "workout_of_the_week",
    requirementType: "wotw_count",
    requirement: {
      value: 10,
    },
    xpReward: 250,
  },
  {
    name: "Challenge Collector",
    description: "Complete 25 Workout of the Week attempts, including repeats.",
    category: "workout_of_the_week",
    requirementType: "wotw_count",
    requirement: {
      value: 25,
    },
    xpReward: 500,
  },
  {
    name: "WOTW Veteran",
    description: "Complete 50 Workout of the Week attempts, including repeats.",
    category: "workout_of_the_week",
    requirementType: "wotw_count",
    requirement: {
      value: 50,
    },
    xpReward: 1000,
  },
  {
    name: "See You Tomorrow",
    description: "Complete workouts on 2 consecutive calendar days.",
    category: "consistency",
    requirementType: "workout_streak",
    requirement: {
      value: 2,
    },
    xpReward: 25,
  },
  {
    name: "Three’s a Streak",
    description: "Complete workouts on 3 consecutive calendar days.",
    category: "consistency",
    requirementType: "workout_streak",
    requirement: {
      value: 3,
    },
    xpReward: 50,
  },
  {
    name: "A Week of Progress",
    description: "Complete workouts on 7 consecutive calendar days.",
    category: "consistency",
    requirementType: "workout_streak",
    requirement: {
      value: 7,
    },
    xpReward: 150,
  },
  {
    name: "Every Rep Counts",
    description:
      "Log at least 50 reps across strength and reps-based exercises in one completed workout.",
    category: "workout",
    requirementType: "workout_total_reps",
    requirement: {
      value: 50,
    },
    xpReward: 25,
  },
  {
    name: "Rep Century",
    description:
      "Log at least 100 reps across strength and reps-based exercises in one completed workout.",
    category: "workout",
    requirementType: "workout_total_reps",
    requirement: {
      value: 100,
    },
    xpReward: 50,
  },
  {
    name: "Lost Count",
    description:
      "Log at least 250 reps across strength and reps-based exercises in one completed workout.",
    category: "workout",
    requirementType: "workout_total_reps",
    requirement: {
      value: 250,
    },
    xpReward: 100,
  },
  {
    name: "The Rep Department",
    description:
      "Log at least 500 reps across strength and reps-based exercises in one completed workout.",
    category: "workout",
    requirementType: "workout_total_reps",
    requirement: {
      value: 500,
    },
    xpReward: 150,
  },
  {
    name: "Before the World Wakes",
    description: "Complete a workout started before 6 AM Eastern Time.",
    category: "consistency",
    requirementType: "workout_time_of_day",
    requirement: {
      value: 6,
      operator: "before",
    },
    xpReward: 25,
  },
  {
    name: "Night Shift",
    description: "Complete a workout started after 10 PM Eastern Time.",
    category: "consistency",
    requirementType: "workout_time_of_day",
    requirement: {
      value: 22,
      operator: "after",
    },
    xpReward: 25,
  },
  {
    name: "Nice.",
    description: "We all thought it.",
    category: "oddity",
    requirementType: "level_reached",
    requirement: {
      value: 69,
    },
    xpReward: 69,
    isSecret: true,
  },
  {
    name: "Progress Not Found",
    description: "Error 404: excuses not found.",
    category: "oddity",
    requirementType: "level_reached",
    requirement: {
      value: 404,
    },
    xpReward: 404,
    isSecret: true,
  },
  {
    name: "High Expectations",
    description: "Your standards keep getting higher.",
    category: "oddity",
    requirementType: "level_reached",
    requirement: {
      value: 420,
    },
    xpReward: 420,
    isSecret: true,
  },
  {
    name: "Personal Demon",
    description: "You became the thing your excuses feared.",
    category: "oddity",
    requirementType: "level_reached",
    requirement: {
      value: 666,
    },
    xpReward: 666,
    isSecret: true,
  },
  {
    name: "Lucky Gains",
    description: "That wasn’t luck. You earned it.",
    category: "oddity",
    requirementType: "level_reached",
    requirement: {
      value: 777,
    },
    xpReward: 777,
    isSecret: true,
  },
  {
    name: "The Answer Is Training",
    description: "Life, the universe, and one more set. Complete 42 workouts.",
    category: "oddity",
    requirementType: "workout_count",
    requirement: {
      value: 42,
    },
    xpReward: 200,
    isSecret: true,
  },
  {
    name: "Nice Work.",
    description: "Still funny. Still progress. Complete 69 workouts.",
    category: "oddity",
    requirementType: "workout_count",
    requirement: {
      value: 69,
    },
    xpReward: 350,
    isSecret: true,
  },
  {
    name: "Rep Responsibly",
    description:
      "A very specific achievement. Log at least 69 reps in one completed workout.",
    category: "oddity",
    requirementType: "workout_total_reps",
    requirement: {
      value: 69,
    },
    xpReward: 69,
    isSecret: true,
  },
  {
    name: "Midnight Side Quest",
    description:
      "Apparently the main quest wasn’t enough. Complete a workout started after 11 PM Eastern Time.",
    category: "oddity",
    requirementType: "workout_time_of_day",
    requirement: {
      value: 23,
      operator: "after",
    },
    xpReward: 50,
    isSecret: true,
  },
  {
    name: "One Plate Club",
    description: "Get a bench press of at least 135 lb for 1 rep approved.",
    category: "performance",
    requirementType: "verified_performance",
    requirement: {
      value: 135,
      recordCategory: "1RM",
    },
    xpReward: 100,
    exerciseNames: ["Barbell Bench Press", "Bench Press"],
    measurementType: "weight_reps",
  },
  {
    name: "Two Plate Club",
    description: "Get a bench press of at least 225 lb for 1 rep approved.",
    category: "performance",
    requirementType: "verified_performance",
    requirement: {
      value: 225,
      recordCategory: "1RM",
    },
    xpReward: 250,
    exerciseNames: ["Barbell Bench Press", "Bench Press"],
    measurementType: "weight_reps",
  },
  {
    name: "Solid Foundations",
    description: "Get a back squat of at least 225 lb for 1 rep approved.",
    category: "performance",
    requirementType: "verified_performance",
    requirement: {
      value: 225,
      recordCategory: "1RM",
    },
    xpReward: 150,
    exerciseNames: ["Barbell Back Squat", "Back Squat"],
    measurementType: "weight_reps",
  },
  {
    name: "Three Plates Deep",
    description: "Get a back squat of at least 315 lb for 1 rep approved.",
    category: "performance",
    requirementType: "verified_performance",
    requirement: {
      value: 315,
      recordCategory: "1RM",
    },
    xpReward: 300,
    exerciseNames: ["Barbell Back Squat", "Back Squat"],
    measurementType: "weight_reps",
  },
  {
    name: "Groundbreaker",
    description: "Get a deadlift of at least 315 lb for 1 rep approved.",
    category: "performance",
    requirementType: "verified_performance",
    requirement: {
      value: 315,
      recordCategory: "1RM",
    },
    xpReward: 200,
    exerciseNames: ["Barbell Deadlift", "Deadlift", "Conventional Deadlift"],
    measurementType: "weight_reps",
  },
  {
    name: "Four Plates Up",
    description: "Get a deadlift of at least 405 lb for 1 rep approved.",
    category: "performance",
    requirementType: "verified_performance",
    requirement: {
      value: 405,
      recordCategory: "1RM",
    },
    xpReward: 350,
    exerciseNames: ["Barbell Deadlift", "Deadlift", "Conventional Deadlift"],
    measurementType: "weight_reps",
  },
  {
    name: "Pulling Your Weight",
    description: "Get a set of at least 10 pull-ups approved.",
    category: "performance",
    requirementType: "verified_performance",
    requirement: {
      value: 10,
    },
    xpReward: 200,
    exerciseNames: ["Pull-Up", "Pull-Ups", "Pullup", "Pullups"],
    measurementType: "reps",
  },
  {
    name: "Hold Your Ground",
    description: "Get a plank held for at least 2 minutes approved.",
    category: "performance",
    requirementType: "verified_performance",
    requirement: {
      value: 120,
    },
    xpReward: 100,
    exerciseNames: ["Plank", "Forearm Plank"],
    measurementType: "duration",
  },
  {
    name: "Thirty Minute Club",
    description: "Get a 5K run of 30 minutes or faster approved.",
    category: "performance",
    requirementType: "verified_performance",
    requirement: {
      value: 1800,
      recordCategory: "5k",
    },
    xpReward: 100,
    exerciseNames: ["Running", "Outdoor Run", "Run"],
    measurementType: "distance_time",
  },
  {
    name: "Picking Up the Pace",
    description: "Get a 5K run of 25 minutes or faster approved.",
    category: "performance",
    requirementType: "verified_performance",
    requirement: {
      value: 1500,
      recordCategory: "5k",
    },
    xpReward: 200,
    exerciseNames: ["Running", "Outdoor Run", "Run"],
    measurementType: "distance_time",
  },
];

const makeSlug = (name) =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const makeBadgeKey = (name) =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const buildAchievementInput = (entry, exerciseId = null) => ({
  name: entry.name,
  description: entry.description,
  category: entry.category,
  requirementType: entry.requirementType,
  requirement: {
    value: entry.requirement.value,
    exercise: exerciseId,
    recordCategory: entry.requirement.recordCategory ?? null,
    operator: entry.requirement.operator ?? null,
  },
  xpReward: entry.xpReward,
  badgeKey: makeBadgeKey(entry.name),
  isActive: true,
  isSecret: entry.isSecret ?? false,
});

const validateAchievementInput = async (input) => {
  const validation = achievementCreateSchema.body.validate(input, {
    abortEarly: false,
    convert: false,
  });
  if (validation.error) {
    throw new Error(
      `Invalid achievement ${input.name}: ${validation.error.message}`,
    );
  }
  const achievement = new Achievement(input);
  await achievement.validate();
  return achievement;
};

export const validateAchievementCatalog = async () => {
  const slugs = new Set();
  const badgeKeys = new Set();
  const placeholderExerciseId = new mongoose.Types.ObjectId().toString();

  for (const entry of achievementCatalog) {
    const slug = makeSlug(entry.name);
    const badgeKey = makeBadgeKey(entry.name);
    if (slugs.has(slug) || badgeKeys.has(badgeKey)) {
      throw new Error(`Duplicate achievement name or badge key: ${entry.name}`);
    }
    slugs.add(slug);
    badgeKeys.add(badgeKey);
    if (
      !Number.isInteger(entry.xpReward) ||
      entry.xpReward < 1 ||
      entry.xpReward > 5000
    ) {
      throw new Error(
        `XP reward for ${entry.name} must be a whole number from 1 to 5,000`,
      );
    }
    if (entry.requirementType === "verified_performance") {
      if (
        !entry.exerciseNames?.length ||
        !["weight_reps", "reps", "duration", "distance_time"].includes(
          entry.measurementType,
        )
      ) {
        throw new Error(`Missing exercise configuration for ${entry.name}`);
      }
      if (
        entry.measurementType === "weight_reps" &&
        entry.requirement.recordCategory !== "1RM"
      ) {
        throw new Error(
          `The strength catalog uses one-rep performances: ${entry.name}`,
        );
      }
      if (
        entry.measurementType === "distance_time" &&
        entry.requirement.recordCategory !== "5k"
      ) {
        throw new Error(
          `The running catalog uses 5K performances: ${entry.name}`,
        );
      }
      await validateAchievementInput(
        buildAchievementInput(entry, placeholderExerciseId),
      );
    } else {
      const value = entry.requirement.value;
      if (
        !Number.isInteger(value) ||
        (entry.requirementType !== "workout_time_of_day" && value < 1)
      ) {
        throw new Error(`Invalid target for ${entry.name}`);
      }
      if (entry.requirementType === "echelon_reached" && value > 10) {
        throw new Error(`Echelon must be between 1 and 10: ${entry.name}`);
      }
      await validateAchievementInput(buildAchievementInput(entry));
    }
  }
};

const findExercise = (entry, exercises) => {
  for (const name of entry.exerciseNames) {
    const normalizedName = makeSlug(name);
    const exercise = exercises.find(
      (candidate) =>
        candidate.measurementType === entry.measurementType &&
        (makeSlug(candidate.name) === normalizedName ||
          makeSlug(candidate.slug ?? "") === normalizedName),
    );
    if (exercise) {
      return exercise;
    }
  }
  return null;
};

export const seedAchievements = async ({ dryRun = false } = {}) => {
  await validateAchievementCatalog();
  const secretCount = achievementCatalog.filter(
    (entry) => entry.isSecret,
  ).length;
  console.log(
    `Catalog: ${achievementCatalog.length} achievements (${secretCount} secret). XP rewards: 25–5,000.`,
  );

  if (dryRun) {
    console.table(
      achievementCatalog.map((entry) => ({
        achievement: entry.name,
        rule: entry.requirementType,
        target: entry.requirement.value,
        xp: entry.xpReward,
        secret: entry.isSecret ?? false,
      })),
    );
    console.log(
      "Dry run complete. No .env loaded, database connection, or writes. Exercise matches are checked only when seeding.",
    );
    return;
  }

  dotenv.config({
    path: fileURLToPath(new URL("../../.env", import.meta.url)),
    quiet: true,
  });
  if (!process.env.MONGO_URI?.trim()) {
    throw new Error(
      "Set MONGO_URI in outrise-api/.env or your environment before seeding.",
    );
  }

  let insertedCount = 0;
  let existingCount = 0;
  let missingExerciseCount = 0;
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 15000,
    });
    await Achievement.init();
    const existingAchievements = await Achievement.find({})
      .select("name +slug")
      .lean();
    const existingSlugs = new Set(
      existingAchievements.flatMap((entry) =>
        [makeSlug(entry.name), entry.slug].filter(Boolean),
      ),
    );
    const missingEntries = achievementCatalog.filter(
      (entry) => !existingSlugs.has(makeSlug(entry.name)),
    );
    existingCount = achievementCatalog.length - missingEntries.length;
    const exercises = missingEntries.some(
      (entry) => entry.requirementType === "verified_performance",
    )
      ? await Exercise.find({ isActive: true })
          .select("name slug measurementType")
          .lean()
      : [];
    const documents = [];

    // Resolve and validate every new document before the first insert.
    for (const entry of missingEntries) {
      let exerciseId = null;
      if (entry.requirementType === "verified_performance") {
        const exercise = findExercise(entry, exercises);
        if (!exercise) {
          missingExerciseCount += 1;
          console.warn(
            `Skipped "${entry.name}": no active ${entry.measurementType} exercise matches ${entry.exerciseNames.join(" / ")}.`,
          );
          continue;
        }
        exerciseId = exercise._id.toString();
      }
      const achievement = await validateAchievementInput(
        buildAchievementInput(entry, exerciseId),
      );
      documents.push(achievement.toObject());
    }

    for (const document of documents) {
      const filter = {
        $or: [{ slug: document.slug }, { name: document.name }],
      };
      const now = new Date();
      try {
        // Insert-only upserts preserve existing content, XP, IDs and timestamps.
        const result = await Achievement.updateOne(
          filter,
          {
            $setOnInsert: { ...document, createdAt: now, updatedAt: now },
          },
          {
            upsert: true,
            runValidators: true,
            timestamps: false,
            setDefaultsOnInsert: false,
          },
        );
        if (result.upsertedCount) {
          insertedCount += 1;
        } else {
          existingCount += 1;
        }
      } catch (error) {
        if (error?.code !== 11000) {
          throw error;
        }
        const existingAchievement = await Achievement.exists(filter);
        if (!existingAchievement) {
          throw error;
        }
        existingCount += 1;
      }
    }
    console.log(
      `Complete. Inserted: ${insertedCount}. Existing matches preserved: ${existingCount}. Missing or incompatible exercises: ${missingExerciseCount}.`,
    );
    console.log(
      "Achievements are checked on the next relevant workout or verification. This script does not unlock achievements or award XP.",
    );
  } catch (error) {
    console.error(
      `Seeding stopped after ${insertedCount} inserts. Rerunning is safe; existing achievements are preserved.`,
    );
    throw error;
  } finally {
    await mongoose.disconnect();
  }
};

const main = async () => {
  const args = process.argv.slice(2);
  if (args.includes("--help")) {
    console.log("Usage: node src/seeds/seedAchievements.js [--dry-run]");
    console.log(
      "Without --dry-run, inserts missing achievements using MONGO_URI. Existing entries are preserved.",
    );
    return;
  }
  if (args.some((argument) => argument !== "--dry-run")) {
    throw new Error("Unknown argument. Use --help or --dry-run.");
  }
  await seedAchievements({ dryRun: args.includes("--dry-run") });
};

// Importing this file does not execute the seeder or connect to MongoDB.
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error) => {
    if (error.name === "Error") {
      console.error(error.message);
    } else {
      console.error(
        `Achievement seeding failed (${error.name}). Check the catalog, database connection and achievement indexes.`,
      );
    }
    process.exitCode = 1;
  });
}
