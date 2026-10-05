import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import WorkoutOfTheWeek from "../src/models/WorkoutOfTheWeek.js";
import WorkoutOfTheWeekOccurrence from "../src/models/WorkoutOfTheWeekOccurrence.js";
import Exercise from "../src/models/Exercise.js";
import {
  createWorkoutOfTheWeek,
  createWorkoutOfTheWeekOccurrence,
  ensureCurrentWorkoutOfTheWeekOccurrence,
  updateWorkoutOfTheWeek,
  getWorkoutOfTheWeekOccurrences,
} from "../src/services/workoutOfTheWeek.service.js";
import {
  getCurrentWorkoutOfTheWeekWindow,
  getWorkoutOfTheWeekWindow,
} from "../src/utils/workoutOfTheWeekDates.js";
import {
  createWorkoutOfTheWeekSchema,
  createWorkoutOfTheWeekOccurrenceSchema,
  getWorkoutOfTheWeekOccurrencesSchema,
} from "../src/middleware/validators/workoutOfTheWeek.validators.js";
import routes from "../src/routes/workoutOfTheWeek.routes.js";
import { authenticate } from "../src/middleware/auth.js";

const id = () => new mongoose.Types.ObjectId();
const adminId = id(),
  exerciseId = id(),
  templateId = id();
const exercise = {
  _id: exerciseId,
  name: "Pushup",
  measurementType: "reps",
  isActive: true,
};
const query = (value) => ({
  select() {
    return this;
  },
  sort() {
    return this;
  },
  skip() {
    return this;
  },
  limit() {
    return this;
  },
  populate: async () => value,
  then(resolve, reject) {
    return Promise.resolve(value).then(resolve, reject);
  },
});
function template() {
  const doc = new WorkoutOfTheWeek({
    _id: templateId,
    name: "Push Challenge",
    description: "A weekly challenge",
    bonusXP: 50,
    difficulty: "medium",
    createdBy: adminId,
    exercises: [
      { exercise: exerciseId, order: 0, target: { sets: 2, reps: 10 } },
    ],
  });
  const result = {
    _id: doc._id,
    name: doc.name,
    description: doc.description,
    bonusXP: doc.bonusXP,
    difficulty: doc.difficulty,
    createdBy: adminId,
    exercises: [{ exercise, order: 0, target: doc.exercises[0].target }],
  };
  result.populate = async () => result;
  return result;
}

test("admins create templates using active exercises and valid targets", async (t) => {
  t.mock.method(Exercise, "find", async (filter) => {
    assert.equal(filter.isActive, true);
    return [exercise];
  });
  const input = {
    name: "Push Challenge",
    description: "",
    bonusXP: 50,
    difficulty: "medium",
    createdBy: adminId,
    exercises: [
      { exercise: String(exerciseId), order: 0, target: { sets: 2, reps: 10 } },
    ],
  };
  t.mock.method(WorkoutOfTheWeek, "create", async (data) => {
    const doc = new WorkoutOfTheWeek(data);
    await doc.validate();
    return doc;
  });
  const result = await createWorkoutOfTheWeek(input);
  assert.equal(result.bonusXP, 50);
  await assert.rejects(
    () =>
      createWorkoutOfTheWeek({
        ...input,
        exercises: [
          {
            exercise: String(exerciseId),
            order: 0,
            target: { timeSeconds: 60 },
          },
        ],
      }),
    /not valid/,
  );
  t.mock.method(Exercise, "find", async () => []);
  await assert.rejects(() => createWorkoutOfTheWeek(input), /not found/);
  const { createdBy, ...body } = input;
  assert.equal(
    createWorkoutOfTheWeekSchema.body.validate(body).error,
    undefined,
  );
  assert.ok(
    createWorkoutOfTheWeekSchema.body.validate({ ...body, bonusXP: 0 }).error,
  );
  assert.ok(
    createWorkoutOfTheWeekSchema.body.validate({
      ...body,
      difficulty: "unknown",
    }).error,
  );
});

test("admin scheduling saves a Monday-week snapshot with the selecting admin", async (t) => {
  const source = template();
  t.mock.method(WorkoutOfTheWeekOccurrence, "findOne", async () => null);
  t.mock.method(WorkoutOfTheWeek, "findOne", (filter) => {
    assert.equal(filter.isActive, true);
    return query(source);
  });
  t.mock.method(Exercise, "find", async () => [exercise]);
  t.mock.method(WorkoutOfTheWeekOccurrence, "create", async (data) => {
    const doc = new WorkoutOfTheWeekOccurrence(data);
    await doc.validate();
    return doc;
  });
  const result = await createWorkoutOfTheWeekOccurrence({
    workoutOfTheWeekId: templateId,
    startDate: "2030-01-07",
    selectionSource: "admin",
    selectedBy: adminId,
  });
  assert.equal(result.selectionSource, "admin");
  assert.equal(String(result.selectedBy), String(adminId));
  assert.equal(result.status, "upcoming");
  assert.equal(result.startsAt.toISOString(), "2030-01-07T05:00:00.000Z");
  assert.equal(result.endsAt.toISOString(), "2030-01-14T05:00:00.000Z");
  assert.deepEqual(result.exercises[0].target.toObject(), {
    sets: 2,
    reps: 10,
  });
  assert.equal(result.exercises[0].exerciseName, "Pushup");
  source.name = "Changed template";
  assert.equal(result.name, "Push Challenge");
});

test("scheduling rejects occupied weeks, adjacent repeats, non-Mondays, and unavailable exercises", async (t) => {
  const input = {
    workoutOfTheWeekId: templateId,
    startDate: "2030-01-07",
    selectionSource: "admin",
    selectedBy: adminId,
  };
  const source = template();
  t.mock.method(WorkoutOfTheWeek, "findOne", () => query(source));
  t.mock.method(Exercise, "find", async () => []);
  t.mock.method(WorkoutOfTheWeekOccurrence, "create", () =>
    assert.fail("Rejected schedules must not be written"),
  );
  t.mock.method(WorkoutOfTheWeekOccurrence, "findOne", async () => ({
    workoutOfTheWeek: templateId,
  }));
  await assert.rejects(
    () => createWorkoutOfTheWeekOccurrence(input),
    /already scheduled/,
  );
  t.mock.method(WorkoutOfTheWeekOccurrence, "findOne", async (filter) =>
    filter.endsAt instanceof Date ? { workoutOfTheWeek: templateId } : null,
  );
  await assert.rejects(
    () => createWorkoutOfTheWeekOccurrence(input),
    /previous week/,
  );
  t.mock.method(WorkoutOfTheWeekOccurrence, "findOne", async (filter) =>
    filter.startsAt instanceof Date ? { workoutOfTheWeek: templateId } : null,
  );
  await assert.rejects(
    () => createWorkoutOfTheWeekOccurrence(input),
    /following week/,
  );
  t.mock.method(WorkoutOfTheWeekOccurrence, "findOne", async () => null);
  await assert.rejects(
    () => createWorkoutOfTheWeekOccurrence(input),
    /not found/,
  );
  await assert.rejects(
    () =>
      createWorkoutOfTheWeekOccurrence({ ...input, startDate: "2030-01-08" }),
    /Monday/,
  );
  await assert.rejects(
    () =>
      createWorkoutOfTheWeekOccurrence({ ...input, startDate: "2020-01-06" }),
    /Finished weeks/,
  );
  assert.ok(
    createWorkoutOfTheWeekOccurrenceSchema.body.validate({
      workoutOfTheWeekId: "invalid",
      startDate: input.startDate,
    }).error,
  );
  const spring = getWorkoutOfTheWeekWindow("2030-03-04");
  assert.equal((spring.weekEnd - spring.weekStart) / 3600000, 167); // New York's spring DST transition.
});

test("an existing admin selection is preserved instead of choosing another template", async (t) => {
  const scheduled = { _id: id(), selectionSource: "admin" };
  t.mock.method(WorkoutOfTheWeekOccurrence, "findOne", async () => scheduled);
  t.mock.method(WorkoutOfTheWeek, "find", () =>
    assert.fail("An existing selection must not be replaced"),
  );
  assert.equal(await ensureCurrentWorkoutOfTheWeekOccurrence(), scheduled);
});

test("random selection excludes adjacent templates and templates with unavailable exercises", async (t) => {
  const window = getCurrentWorkoutOfTheWeekWindow();
  const previousId = id(),
    nextId = id();
  const valid = template(),
    unavailable = {
      _id: id(),
      exercises: [{ exercise: id(), target: { sets: 1, reps: 1 } }],
    };
  valid.exercises[0].exercise = exerciseId;
  valid.populate = async () => {
    valid.exercises[0].exercise = exercise;
    return valid;
  };
  t.mock.method(WorkoutOfTheWeekOccurrence, "findOne", async (filter) => {
    if (filter.startsAt && filter.endsAt) return null;
    if (filter.endsAt) {
      assert.equal(+filter.endsAt, +window.weekStart);
      return { workoutOfTheWeek: previousId };
    }
    return { workoutOfTheWeek: nextId };
  });
  t.mock.method(WorkoutOfTheWeek, "find", async (filter) => {
    assert.equal(filter.isActive, true);
    assert.deepEqual(filter._id.$nin, [previousId, nextId]);
    return [unavailable, valid];
  });
  t.mock.method(Exercise, "find", async () => [exercise]);
  t.mock.method(WorkoutOfTheWeekOccurrence, "create", async (data) => data);
  const result = await ensureCurrentWorkoutOfTheWeekOccurrence();
  assert.equal(result.workoutOfTheWeek, valid._id);
  assert.equal(result.selectionSource, "random");
  assert.equal(result.selectedBy, null);
});

test("no usable random template leaves WOTW unavailable without creating an invalid challenge", async (t) => {
  t.mock.method(WorkoutOfTheWeekOccurrence, "findOne", async () => null);
  t.mock.method(WorkoutOfTheWeek, "find", async () => [
    { exercises: [{ exercise: id(), target: {} }] },
  ]);
  t.mock.method(Exercise, "find", async () => []);
  t.mock.method(WorkoutOfTheWeekOccurrence, "create", () =>
    assert.fail("Unavailable exercises must not be scheduled"),
  );
  await assert.rejects(
    () => ensureCurrentWorkoutOfTheWeekOccurrence(),
    (error) => error.name === "NoEligibleWorkoutOfTheWeekError",
  );
});

test("editing a previously scheduled template creates a new version without changing the old one", async (t) => {
  const source = template();
  t.mock.method(WorkoutOfTheWeek, "findOne", async () => source);
  t.mock.method(WorkoutOfTheWeekOccurrence, "exists", async () => ({
    _id: id(),
  }));
  t.mock.method(WorkoutOfTheWeek, "create", async (data) => ({
    ...data,
    _id: id(),
    populate: async () => {},
  }));
  const result = await updateWorkoutOfTheWeek({
    workoutOfTheWeekId: templateId,
    updates: { name: "New challenge", bonusXP: 75 },
  });
  assert.equal(result.createdNewTemplate, true);
  assert.equal(result.workoutOfTheWeek.name, "New challenge");
  assert.equal(source.name, "Push Challenge");
  assert.equal(source.bonusXP, 50);
});

test("the schedule endpoint is admin-only, paginated, and validates filters", async (t) => {
  const route = routes.stack.find(
    (layer) => layer.route?.path === "/occurrences" && layer.route.methods.get,
  ).route;
  assert.equal(route.stack[0].handle, authenticate);
  let error;
  route.stack[1].handle({ user: { role: "user" } }, {}, (value) => {
    error = value;
  });
  assert.equal(error.statusCode, 403);
  let allowed = false;
  route.stack[1].handle({ user: { role: "owner" } }, {}, (value) => {
    assert.equal(value, undefined);
    allowed = true;
  });
  assert.ok(allowed);
  t.mock.method(WorkoutOfTheWeekOccurrence, "find", (filter) => {
    assert.deepEqual(filter, { status: "upcoming" });
    const result = query([{ name: "Challenge" }]);
    result.skip = (skip) => {
      assert.equal(skip, 20);
      return result;
    };
    result.limit = (limit) => {
      assert.equal(limit, 20);
      return result;
    };
    return result;
  });
  t.mock.method(WorkoutOfTheWeekOccurrence, "countDocuments", async () => 21);
  const result = await getWorkoutOfTheWeekOccurrences({
    page: 2,
    limit: 20,
    status: "upcoming",
  });
  assert.equal(result.pagination.totalPages, 2);
  assert.ok(
    getWorkoutOfTheWeekOccurrencesSchema.query.validate({ status: "other" })
      .error,
  );
  assert.ok(
    getWorkoutOfTheWeekOccurrencesSchema.query.validate({ limit: 101 }).error,
  );
});
