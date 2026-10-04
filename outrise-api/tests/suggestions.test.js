import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import Suggestion from "../src/models/Suggestion.js";
import { requireRole } from "../src/middleware/requireRole.js";
import { createSuggestion, listSuggestions, updateSuggestion } from "../src/services/suggestion.service.js";
import { createSuggestionSchema, updateSuggestionSchema } from "../src/middleware/validators/suggestion.validators.js";
import { createSuggestionLimiter } from "../src/middleware/suggestionRateLimit.js";
import ownerRouter from "../src/routes/ownerSuggestion.routes.js";
const id = () => new mongoose.Types.ObjectId();
const query = (value) => ({ sort() { return this; }, skip() { return this; }, limit() { return this; }, populate() { return this; }, lean: async () => value });

test("owner inbox rejects users, moderators, and admins; both reads and writes use the owner guard", () => {
  for (const role of ["user", "moderator", "admin", "owner"]) {
    let result;
    requireRole("owner")({ user: { role } }, {}, (error) => { result = error; });
    assert.equal(result?.statusCode, role === "owner" ? undefined : 403);
  }
  const guards = ownerRouter.stack.filter((layer) => !layer.route);
  assert.equal(guards.length, 2);
  let denied;
  guards[1].handle({ user: { role: "admin" } }, {}, (error) => { denied = error; });
  assert.equal(denied.statusCode, 403);
  assert.equal(ownerRouter.stack.filter((layer) => layer.route).length, 2);
});
test("submissions use authenticated identity, default to new, and reject owner-only fields", async (t) => {
  const userId = id();
  t.mock.method(Suggestion, "create", async (input) => {
    assert.deepEqual(input, { user: userId, title: "New idea", message: "Add a workout timer" });
    const doc = new Suggestion(input); await doc.validate(); return doc;
  });
  assert.equal((await createSuggestion({ userId, title: "New idea", message: "Add a workout timer", status: "planned" })).status, "new");
  for (const extra of [{ user: String(id()) }, { status: "planned" }, { revision: 5 }]) {
    assert.ok(createSuggestionSchema.body.validate({ title: "New idea", message: "Add a workout timer", ...extra }).error);
  }
  assert.ok(createSuggestionSchema.body.validate({ title: "  ", message: "too short" }).error);
});
test("inbox filters status and paginates; updates use revision checks without overwriting submission content", async (t) => {
  t.mock.method(Suggestion, "find", (filter) => { assert.deepEqual(filter, { status: "planned" }); return query([{ title: "Idea" }]); });
  t.mock.method(Suggestion, "countDocuments", async () => 21);
  const result = await listSuggestions({ page: 2, limit: 20, status: "planned" });
  assert.equal(result.pagination.totalPages, 2);
  t.mock.method(Suggestion, "findOneAndUpdate", (filter, update, options) => {
    assert.equal(filter.revision, 3);
    assert.deepEqual(update, { $set: { status: "closed" }, $inc: { revision: 1 } });
    assert.equal(options.returnDocument, "after"); return query({ status: "closed", revision: 4 });
  });
  assert.equal((await updateSuggestion({ suggestionId: id(), status: "closed", expectedRevision: 3 })).revision, 4);
  t.mock.method(Suggestion, "findOneAndUpdate", () => query(null));
  t.mock.method(Suggestion, "exists", async () => true);
  await assert.rejects(() => updateSuggestion({ suggestionId: id(), status: "closed", expectedRevision: 3 }), (error) => error.statusCode === 409);
  t.mock.method(Suggestion, "exists", async () => null);
  await assert.rejects(() => updateSuggestion({ suggestionId: id(), status: "closed", expectedRevision: 3 }), (error) => error.statusCode === 404);
  assert.ok(updateSuggestionSchema.body.validate({ status: "invalid", expectedRevision: 0 }).error);
});
test("suggestion limits are scoped to the signed-in account and reset after the window", () => {
  let time = 0; const limiter = createSuggestionLimiter({ max: 1, windowMs: 1000, now: () => time });
  let calls = 0, status;
  const res = { set() {}, status(code) { status = code; return this; }, json() {} };
  const run = (userId) => limiter({ user: { userId } }, res, () => { calls++; });
  run("a"); run("a"); assert.equal(status, 429); assert.equal(calls, 1);
  run("b"); assert.equal(calls, 2);
  time = 1000; run("a"); assert.equal(calls, 3);
});
