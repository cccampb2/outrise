import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import User from "../src/models/User.js";
import AccountModeration from "../src/models/AccountModeration.js";
import { clearAgeEligibilityRejection } from "../src/services/adminUser.service.js";
import router from "../src/routes/adminUser.routes.js";
const query = (value) => ({
  session() {
    return this;
  },
  select() {
    return this;
  },
  then(resolve, reject) {
    return Promise.resolve(value).then(resolve, reject);
  },
});
function mockSession(t) {
  const s = { withTransaction: async (fn) => fn(), endSession: async () => {} };
  t.mock.method(mongoose, "startSession", async () => s);
  return s;
}
test("owner reset clears only age state and records the support review", async (t) => {
  const session = mockSession(t);
  const id = new mongoose.Types.ObjectId();
  t.mock.method(User, "findById", () => query({ role: "owner" }));
  t.mock.method(User, "findOneAndUpdate", (filter, update, options) => {
    assert.equal(filter.deletionRequestedAt, null);
    assert.deepEqual(filter.ageEligibilityRejectedAt, { $ne: null });
    assert.deepEqual(update.$set, {
      ageEligibilityRejectedAt: null,
      ageEligibilityConfirmedAt: null,
    });
    assert.equal(options.session, session);
    return query({ _id: id, accountStatus: "banned", suspendedUntil: null });
  });
  t.mock.method(AccountModeration, "create", async ([record], options) => {
    assert.equal(record.status, "banned");
    assert.match(record.reason, /support review: Corrected mistake/);
    assert.equal(options.session, session);
  });
  const user = await clearAgeEligibilityRejection({
    userId: id,
    ownerId: new mongoose.Types.ObjectId(),
    reason: "Corrected mistake",
  });
  assert.equal(user.accountStatus, "banned");
});
test("nonowners cannot clear age rejections", async (t) => {
  mockSession(t);
  t.mock.method(User, "findById", () => query({ role: "admin" }));
  t.mock.method(User, "findOneAndUpdate", () =>
    assert.fail("No reset allowed"),
  );
  await assert.rejects(
    clearAgeEligibilityRejection({
      userId: new mongoose.Types.ObjectId(),
      ownerId: new mongoose.Types.ObjectId(),
      reason: "Review",
    }),
    (error) => error.statusCode === 403,
  );
});
test("owner review route exists separately from ordinary moderation", () => {
  assert.ok(
    router.stack.find(
      (layer) => layer.route?.path === "/:userId/age-eligibility/reset",
    ),
  );
});
