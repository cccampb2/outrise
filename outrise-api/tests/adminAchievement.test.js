import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import Achievement from "../src/models/Achievement.js";
import Exercise from "../src/models/Exercise.js";
import WorkoutSession from "../src/models/WorkoutSession.js";
import {
  createAdminAchievement,
  updateAdminAchievement,
  setAchievementStatus,
  listAdminAchievements,
} from "../src/services/adminAchievement.service.js";
import { checkWorkoutStreakAchievements } from "../src/services/achievement.service.js";
import { achievementCreateSchema } from "../src/middleware/validators/adminAchievement.validators.js";
import { requireRole } from "../src/middleware/requireRole.js";

const exerciseId = new mongoose.Types.ObjectId().toString();
const base = {
  name: "Echelon II",
  description: "Reach Echelon 2",
  category: "echelon",
  requirementType: "echelon_reached",
  requirement: {
    value: 2,
    exercise: null,
    recordCategory: null,
    operator: null,
  },
  xpReward: 100,
  badgeKey: "echelon2",
  isActive: true,
  isSecret: false,
};

test("admin management supports all ten rules and runs document validation", async (t) => {
  t.mock.method(Achievement.prototype, "save", async function () {
    await this.validate();
    return this;
  });
  t.mock.method(Exercise, "findById", () => ({
    select: async () => ({ measurementType: "weight_reps" }),
  }));
  for (const requirementType of Achievement.schema.path("requirementType")
    .enumValues) {
    const requirement = { ...base.requirement, value: 2 };
    if (requirementType === "workout_time_of_day")
      requirement.operator = "before";
    if (requirementType === "verified_performance") {
      requirement.exercise = exerciseId;
      requirement.recordCategory = "1RM";
    }
    const achievement = await createAdminAchievement({
      ...base,
      requirementType,
      requirement,
    });
    assert.equal(achievement.slug, "echelonii");
    assert.equal(achievement.requirementType, requirementType);
  }
});

test("rejects invalid targets and mismatched rule fields", async (t) => {
  t.mock.method(Achievement.prototype, "save", async function () {
    await this.validate();
    return this;
  });
  for (const value of [0, 11, 1.5])
    await assert.rejects(
      () =>
        createAdminAchievement({
          ...base,
          requirement: { ...base.requirement, value },
        }),
      /Echelon/,
    );
  await assert.rejects(
    () =>
      createAdminAchievement({
        ...base,
        requirement: { ...base.requirement, exercise: exerciseId },
      }),
    /only apply/,
  );
  await assert.rejects(
    () =>
      createAdminAchievement({
        ...base,
        requirementType: "workout_time_of_day",
        requirement: { ...base.requirement, value: 24, operator: "before" },
      }),
    /hour/,
  );
  t.mock.method(Exercise, "findById", () => ({
    select: async () => ({ measurementType: "distance_time" }),
  }));
  const data = {
    ...base,
    requirementType: "verified_performance",
    requirement: { ...base.requirement, exercise: exerciseId, value: 300 },
  };
  await assert.rejects(() => createAdminAchievement(data), /running distance/);
  await assert.rejects(
    () =>
      createAdminAchievement({
        ...data,
        requirement: { ...data.requirement, recordCategory: "1RM" },
      }),
    /does not match/,
  );
  const valid = await createAdminAchievement({
    ...data,
    requirement: { ...data.requirement, recordCategory: "1_mile" },
  });
  assert.equal(valid.requirement.value, 300);
  t.mock.method(Exercise, "findById", () => ({ select: async () => null }));
  await assert.rejects(
    () => createAdminAchievement(data),
    /Exercise not found/,
  );
});

test("edit and deactivate retain the achievement ID", async (t) => {
  const original = new Achievement(base);
  const id = original._id.toString();
  t.mock.method(Achievement, "findById", async () => original);
  t.mock.method(Achievement.prototype, "save", async function () {
    await this.validate();
    return this;
  });
  const updated = await updateAdminAchievement(id, {
    ...base,
    name: "New Name",
  });
  assert.equal(updated.slug, "newname");
  assert.equal(updated._id.toString(), id);
  const inactive = await setAchievementStatus(id, false);
  assert.equal(inactive.isActive, false);
  assert.equal(inactive._id.toString(), id);
  t.mock.method(Achievement, "findById", async () => null);
  await assert.rejects(() => updateAdminAchievement(id, base), /not found/);
});

test("list paginates inactive achievements and treats search as literal text", async (t) => {
  let filter;
  const query = {
    sort() {
      return this;
    },
    skip(value) {
      assert.equal(value, 20);
      return this;
    },
    limit(value) {
      assert.equal(value, 20);
      return this;
    },
    lean: async () => [],
  };
  t.mock.method(Achievement, "find", (value) => {
    filter = value;
    return query;
  });
  t.mock.method(Achievement, "countDocuments", async () => 21);
  const result = await listAdminAchievements({
    page: 2,
    limit: 20,
    status: "inactive",
    search: "Echelon.*",
  });
  assert.equal(filter.isActive, false);
  assert.equal(filter.name.$regex, "Echelon\\.\\*");
  assert.equal(result.pagination.totalPages, 2);
});

test("request validation and admin guard reject unauthorized or malformed changes", () => {
  assert.equal(achievementCreateSchema.body.validate(base).error, undefined);
  assert.ok(
    achievementCreateSchema.body.validate({ ...base, xpReward: 0 }).error,
  );
  assert.ok(
    achievementCreateSchema.body.validate({
      ...base,
      requirementType: "unsupported",
    }).error,
  );
  let error;
  requireRole("admin")({ user: { role: "user" } }, {}, (value) => {
    error = value;
  });
  assert.equal(error.statusCode, 403);
  error = "not called";
  requireRole("admin")({ user: { role: "admin" } }, {}, (value) => {
    error = value;
  });
  assert.equal(error, undefined);
});

test("streak counts the first day and ignores duplicate workouts on a day", async (t) => {
  let target;
  let dates = [new Date("2026-10-01T16:00:00Z")];
  const query = {
    select() {
      return this;
    },
    sort() {
      return this;
    },
    session: async () => dates.map((completedAt) => ({ completedAt })),
  };
  t.mock.method(WorkoutSession, "find", () => query);
  t.mock.method(Achievement, "find", (filter) => {
    target = filter["requirement.value"].$lte;
    return {
      select() {
        return this;
      },
      session: async () => [],
    };
  });
  await checkWorkoutStreakAchievements({
    userId: exerciseId,
    workoutSessionId: exerciseId,
  });
  assert.equal(target, 1);
  dates = [
    new Date("2026-10-01T16:00:00Z"),
    new Date("2026-10-01T15:00:00Z"),
    new Date("2026-09-30T16:00:00Z"),
    new Date("2026-09-29T16:00:00Z"),
    new Date("2026-09-27T16:00:00Z"),
  ];
  await checkWorkoutStreakAchievements({
    userId: exerciseId,
    workoutSessionId: exerciseId,
  });
  assert.equal(target, 3);
});
