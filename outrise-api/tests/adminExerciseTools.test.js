import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import Exercise from "../src/models/Exercise.js";
import { getExercises, getExerciseById, createExercise } from "../src/services/exercise.service.js";
import { createExerciseSchema } from "../src/middleware/validators/exercise.validators.js";

const id = () => new mongoose.Types.ObjectId();
function query(value, onSelect) {
  return { sort() { return this; }, skip() { return this; }, limit() { return this; }, select(fields) { onSelect(fields); return this; }, then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); } };
}
test("only admins and owners can read exercise XP and archived exercises", async (t) => {
  const selected = [];
  t.mock.method(Exercise, "find", () => query([], (fields) => selected.push(fields)));
  t.mock.method(Exercise, "findOne", () => query({ _id: id() }, (fields) => selected.push(fields)));
  t.mock.method(Exercise, "countDocuments", async () => 0);
  await getExercises({ page: 1, limit: 20, userRole: "user" });
  await getExerciseById({ exerciseId: id(), userRole: "user" });
  assert.equal(selected.length, 0);
  for (const userRole of ["admin", "owner"]) {
    await getExercises({ page: 1, limit: 20, userRole, status: "archived" });
    await getExerciseById({ exerciseId: id(), userRole });
  }
  assert.deepEqual(selected, ["+baseXP", "+baseXP", "+baseXP", "+baseXP"]);
  await assert.rejects(() => getExercises({ page: 1, limit: 20, userRole: "user", status: "archived" }), (error) => error.statusCode === 403);
});

test("exercise search treats punctuation as literal text", async (t) => {
  t.mock.method(Exercise, "find", (filter) => {
    assert.equal(filter.name.$regex, "Push \\(wide\\)");
    return query([], () => {});
  });
  t.mock.method(Exercise, "countDocuments", async () => 0);
  await getExercises({ page: 1, limit: 20, userRole: "admin", search: "Push (wide)" });
});

test("exercise creation enforces XP bounds, valid logging types, and duplicate names", async (t) => {
  const data = { name: "Push Up", slug: "push-up", description: "A bodyweight pushing exercise", category: "bodyweight", measurementType: "reps", baseXP: 5 };
  const result = createExerciseSchema.body.validate(data);
  assert.equal(result.error, undefined);
  for (const change of [{ baseXP: 4 }, { baseXP: 31 }, { baseXP: 5.5 }, { measurementType: "other" }]) assert.ok(createExerciseSchema.body.validate({ ...data, ...change }).error);
  t.mock.method(Exercise, "findOne", async () => null);
  t.mock.method(Exercise, "create", async (input) => { assert.equal(input.normalizedName, "pushup"); const doc = new Exercise(input); await doc.validate(); return doc; });
  assert.equal((await createExercise(result.value)).baseXP, 5);
  t.mock.method(Exercise, "findOne", async () => ({ _id: id() }));
  await assert.rejects(() => createExercise(result.value), /already exists/);
});
