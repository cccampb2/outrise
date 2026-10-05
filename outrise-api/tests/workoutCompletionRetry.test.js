import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import WorkoutSession from "../src/models/WorkoutSession.js";
import User from "../src/models/User.js";
import Exercise from "../src/models/Exercise.js";
import PersonalRecord from "../src/models/PersonalRecord.js";
import Achievement from "../src/models/Achievement.js";
import XPTransaction from "../src/models/XPtransaction.js";
import Season from "../src/models/Season.js";
import ActivityEvent from "../src/models/ActivityEvent.js";
import { completeActiveWorkoutSession } from "../src/services/workoutSession.service.js";
import { completeActiveWorkoutSessionController } from "../src/controllers/workoutSession.controller.js";
import { workoutSessionIdSchema } from "../src/middleware/validators/workoutSession.validators.js";

const id = () => new mongoose.Types.ObjectId();
const query = (value) => ({
  select() {
    return this;
  },
  sort() {
    return this;
  },
  session: async () => value,
});

function fixture(t, { status = "active", valid = true } = {}) {
  const userId = id(),
    sessionId = id(),
    exerciseId = id();
  const session = {
    withTransaction: async (callback) => callback(),
    endSession: async () => {},
  };
  t.mock.method(mongoose, "startSession", async () => session);
  const workout = {
    _id: sessionId,
    user: userId,
    status,
    startedAt: new Date(Date.now() - 10000),
    workoutName: "Push",
    sourceType: "workout",
    workoutOfTheWeekOccurrence: null,
    exercises: [
      {
        exercise: exerciseId,
        exerciseName: "Pushup",
        measurementType: "reps",
        skipped: false,
        actual: { sets: valid ? [{ reps: 5 }] : null },
      },
    ],
    save: async (options) => {
      assert.equal(options.session, session);
    },
  };
  const queries = [],
    counters = { workoutCount: 0, xpAwards: 0, events: 0 };
  t.mock.method(WorkoutSession, "findOne", (filter) => {
    queries.push(filter);
    return query(
      String(filter.user) === String(userId) &&
        (!filter._id || String(filter._id) === String(sessionId))
        ? workout
        : null,
    );
  });
  t.mock.method(WorkoutSession, "find", () => query([]));
  t.mock.method(WorkoutSession, "countDocuments", () => query(1));
  t.mock.method(User, "findById", () =>
    query({ username: "Caleb", lifetimeXP: 0, totalWorkouts: 1 }),
  );
  t.mock.method(User, "findByIdAndUpdate", async (filter, update) => {
    counters.workoutCount += update.$inc.totalWorkouts ?? 0;
    return { username: "Caleb", lifetimeXP: 5 };
  });
  t.mock.method(PersonalRecord, "findOne", () => query({ value: 100 }));
  t.mock.method(Exercise, "find", () =>
    query([{ _id: exerciseId, baseXP: 5 }]),
  );
  t.mock.method(Achievement, "find", () => query([]));
  t.mock.method(XPTransaction, "aggregate", () => query([]));
  t.mock.method(XPTransaction.prototype, "save", async function () {
    counters.xpAwards++;
    return this;
  });
  t.mock.method(Season, "findOne", () => query(null));
  t.mock.method(
    ActivityEvent,
    "findOneAndUpdate",
    async (filter, update, options) => {
      assert.equal(options.session, session);
      counters.events++;
      return update.$setOnInsert;
    },
  );
  return { userId, sessionId, workout, queries, counters };
}

test("a lost completion response can be retried by ID with identical results and no repeated rewards", async (t) => {
  const f = fixture(t);
  const first = await completeActiveWorkoutSession(f);
  assert.equal(first.workoutSession.status, "completed");
  assert.equal(first.xpEarned.total, 5);
  assert.equal(first.workoutSession.completionSummary, undefined);
  assert.ok(f.workout.completionSummary);
  const serializedFirst = JSON.parse(JSON.stringify(first));
  // A different active workout must not become the target of this retry.
  const second = await completeActiveWorkoutSession(f);
  assert.deepEqual(JSON.parse(JSON.stringify(second)), serializedFirst);
  assert.deepEqual(f.counters, { workoutCount: 1, xpAwards: 1, events: 1 });
  assert.ok(
    f.queries.every(
      (filter) =>
        filter._id === f.sessionId &&
        filter.user === f.userId &&
        !filter.status,
    ),
  );
});

test("foreign and missing sessions cannot be completed or replayed", async (t) => {
  const f = fixture(t);
  await assert.rejects(
    () => completeActiveWorkoutSession({ ...f, userId: id() }),
    /not found/,
  );
  await assert.rejects(
    () => completeActiveWorkoutSession({ ...f, sessionId: id() }),
    /not found/,
  );
  assert.deepEqual(f.counters, { workoutCount: 0, xpAwards: 0, events: 0 });
});

test("a cancelled session is rejected and incomplete performance remains editable", async (t) => {
  const f = fixture(t, { status: "cancelled", valid: false });
  await assert.rejects(() => completeActiveWorkoutSession(f), /cancelled/);
  f.workout.status = "active";
  await assert.rejects(
    () => completeActiveWorkoutSession(f),
    /must be completed or skipped/,
  );
  assert.equal(f.workout.status, "active");
  assert.deepEqual(f.counters, { workoutCount: 0, xpAwards: 0, events: 0 });
});

test("older completed sessions confirm success without inventing rewards or awarding them again", async (t) => {
  const f = fixture(t, { status: "completed" });
  const result = await completeActiveWorkoutSession(f);
  assert.equal(result.workoutSession._id, f.sessionId);
  assert.equal(result.xpEarned, null);
  assert.equal(result.dailyXP, null);
  assert.deepEqual(f.counters, { workoutCount: 0, xpAwards: 0, events: 0 });
});

test("legacy completion without a body still works, while new route IDs are validated", async (t) => {
  const f = fixture(t);
  let result;
  await completeActiveWorkoutSessionController(
    { user: { userId: f.userId }, params: {} },
    {
      status(code) {
        assert.equal(code, 200);
        return this;
      },
      json(value) {
        result = value;
      },
    },
    (error) => {
      throw error;
    },
  );
  assert.equal(result.workoutSession.status, "completed");
  assert.equal(f.queries[0].status, "active");
  assert.ok(workoutSessionIdSchema.params.validate({ id: "invalid" }).error);
  assert.equal(
    workoutSessionIdSchema.params.validate({ id: String(f.sessionId) }).error,
    undefined,
  );
});
