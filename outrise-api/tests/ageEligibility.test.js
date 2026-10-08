import { TERMS_VERSION, PRIVACY_VERSION } from "../src/config/legal.js";
const legalAcceptance = {
  acceptedAt: new Date("2026-10-07T12:00:00Z"),
  termsVersion: TERMS_VERSION,
  privacyVersion: PRIVACY_VERSION,
};
import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { errorHandler } from "../src/middleware/errorHandler.js";
import ForbiddenError from "../src/errors/ForbiddenError.js";
import User from "../src/models/User.js";
import {
  validateAgeEligibility,
  confirmAgeEligibility,
} from "../src/services/ageEligibility.service.js";
import { registerUser } from "../src/services/auth.services.js";
import {
  authenticate,
  authenticateUnverified,
} from "../src/middleware/auth.js";
import { socketAuth } from "../src/middleware/socketAuth.js";
import {
  registerSchema,
  ageEligibilitySchema,
} from "../src/middleware/validators/auth.validators.js";
const userId = "507f1f77bcf86cd799439011";
const date = new Date("2026-10-05T12:00:00Z");
const query = (value) => ({
  select() {
    return this;
  },
  then(resolve, reject) {
    return Promise.resolve(value).then(resolve, reject);
  },
});
const account = (fields = {}) => ({
  _id: userId,
  role: "user",
  accountStatus: "active",
  emailVerified: true,
  legalAcceptance,
  tokenVersion: 0,
  ...fields,
});
function secret(t) {
  const previous = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "age-tests-only";
  t.after(() => {
    if (previous === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previous;
  });
}
test("only whole-number adult ages are accepted by service and request validation", () => {
  for (const age of [
    undefined,
    null,
    "18",
    true,
    17,
    -1,
    18.5,
    121,
    NaN,
    Infinity,
  ]) {
    assert.throws(() => validateAgeEligibility(age));
    if (age === 17)
      assert.equal(
        ageEligibilitySchema.body.validate({ age }).error,
        undefined,
      );
    else assert.ok(ageEligibilitySchema.body.validate({ age }).error);
  }
  for (const age of [18, 19, 120]) {
    assert.doesNotThrow(() => validateAgeEligibility(age));
    assert.equal(ageEligibilitySchema.body.validate({ age }).error, undefined);
  }
  assert.ok(ageEligibilitySchema.body.validate({ age: 18, userId }).error);
  assert.ok(
    ageEligibilitySchema.body.validate({
      age: 18,
      ageEligibilityConfirmedAt: date,
    }).error,
  );
  assert.ok(
    registerSchema.body.validate({
      username: "Tester",
      email: "test@example.com",
      password: "password123",
    }).error,
  );
});
test("underage signup is rejected before any account lookup, save, or email", async (t) => {
  t.mock.method(User, "findOne", () => {
    throw new Error("Should not look up accounts");
  });
  t.mock.method(User, "create", () => {
    throw new Error("Should not create accounts");
  });
  await assert.rejects(
    registerUser({
      username: "Tester",
      email: "test@example.com",
      password: "password123",
      age: 17,
    }),
    /18 or older/,
  );
  assert.equal(User.findOne.mock.callCount(), 0);
  assert.equal(User.create.mock.callCount(), 0);
});
test("confirmation persists only a server date and retry retains the original date", async (t) => {
  let stored = account();
  t.mock.method(User, "findById", () => query(stored));
  t.mock.method(User, "findOneAndUpdate", (filter, update, options) => {
    assert.deepEqual(filter, {
      _id: userId,
      deletionRequestedAt: null,
      ageEligibilityRejectedAt: null,
      ageEligibilityConfirmedAt: null,
    });
    assert.deepEqual(Object.keys(update.$set), ["ageEligibilityConfirmedAt"]);
    assert.ok(update.$set.ageEligibilityConfirmedAt instanceof Date);
    assert.equal(options.returnDocument, "after");
    stored = { ...stored, ...update.$set };
    return query(stored);
  });
  const first = await confirmAgeEligibility({ userId, age: 18 });
  assert.deepEqual(await confirmAgeEligibility({ userId, age: 25 }), first);
  assert.equal(User.findOneAndUpdate.mock.callCount(), 1);
  assert.equal(stored.age, undefined);
  assert.equal(User.schema.path("age"), undefined);
  assert.equal(User.schema.path("dateOfBirth"), undefined);
});
test("concurrent confirmation returns the winning date without overwriting it", async (t) => {
  let lookups = 0;
  t.mock.method(User, "findById", () =>
    query(
      ++lookups === 1
        ? account()
        : account({ ageEligibilityConfirmedAt: date }),
    ),
  );
  t.mock.method(User, "findOneAndUpdate", () => query(null));
  assert.deepEqual(await confirmAgeEligibility({ userId, age: 18 }), {
    ageEligibilityConfirmedAt: date,
  });
});
test("missing and banned accounts cannot confirm eligibility", async (t) => {
  let stored = null;
  t.mock.method(User, "findById", () => query(stored));
  await assert.rejects(
    confirmAgeEligibility({ userId, age: 18 }),
    /Account not found/,
  );
  stored = account({ accountStatus: "banned" });
  await assert.rejects(
    confirmAgeEligibility({ userId, age: 18 }),
    (error) => error.code === "ACCOUNT_BANNED",
  );
});
test("API requires database confirmation, ignores forged JWT claims, and allows recovery endpoints", async (t) => {
  secret(t);
  let stored = account();
  t.mock.method(User, "findById", () => query(stored));
  const token = jwt.sign(
    { userId, ageEligibilityConfirmedAt: date },
    process.env.JWT_SECRET,
  );
  const invoke = async (middleware) => {
    let error;
    await middleware(
      { headers: { authorization: `Bearer ${token}` } },
      {},
      (value) => {
        error = value;
      },
    );
    return error;
  };
  assert.equal((await invoke(authenticate)).code, "AGE_ELIGIBILITY_REQUIRED");
  assert.equal(await invoke(authenticateUnverified), undefined);
  stored.ageEligibilityConfirmedAt = date;
  assert.equal(await invoke(authenticate), undefined);
});
test("sockets cannot connect until the live account confirms eligibility", async (t) => {
  secret(t);
  let stored = account();
  t.mock.method(User, "findById", () => query(stored));
  const token = jwt.sign({ userId }, process.env.JWT_SECRET);
  const invoke = async () => {
    let error;
    const socket = { handshake: { auth: { token } }, data: {} };
    await socketAuth(socket, (value) => {
      error = value;
    });
    return { error, socket };
  };
  assert.match((await invoke()).error.data.message, /age eligibility/);
  stored.ageEligibilityConfirmedAt = date;
  const result = await invoke();
  assert.equal(result.error, undefined);
  assert.equal(result.socket.data.userId, userId);
});

test("age eligibility errors reach the client with a machine-readable code", () => {
  const error = new ForbiddenError(
    "Confirm your age eligibility before continuing.",
  );
  error.code = "AGE_ELIGIBILITY_REQUIRED";
  let status, payload;
  errorHandler(
    error,
    {},
    {
      status(value) {
        status = value;
        return this;
      },
      json(value) {
        payload = value;
      },
    },
    () => {},
  );
  assert.equal(status, 403);
  assert.equal(payload.code, "AGE_ELIGIBILITY_REQUIRED");
});

test("underage account rejection survives later adult answers and never stores the age", async (t) => {
  let stored = account();
  t.mock.method(User, "findById", () => query(stored));
  t.mock.method(User, "findOneAndUpdate", (filter, update) => {
    assert.equal(filter.ageEligibilityRejectedAt, null);
    assert.equal(filter.deletionRequestedAt, null);
    assert.equal(update.$set.ageEligibilityConfirmedAt, null);
    stored = { ...stored, ...update.$set };
    return query(stored);
  });
  const rejection = await confirmAgeEligibility({ userId, age: 15 });
  assert.ok(rejection.ageEligibilityRejectedAt instanceof Date);
  assert.equal(rejection.ageEligibilityConfirmedAt, null);
  assert.deepEqual(await confirmAgeEligibility({ userId, age: 30 }), rejection);
  assert.equal(User.findOneAndUpdate.mock.callCount(), 1);
  assert.equal(stored.age, undefined);
});

test("a racing rejection wins over adult confirmation", async (t) => {
  let reads = 0;
  t.mock.method(User, "findById", () =>
    query(
      ++reads === 1
        ? account()
        : account({
            ageEligibilityRejectedAt: date,
            ageEligibilityConfirmedAt: null,
          }),
    ),
  );
  t.mock.method(User, "findOneAndUpdate", (filter) => {
    assert.equal(filter.ageEligibilityRejectedAt, null);
    return query(null);
  });
  assert.deepEqual(await confirmAgeEligibility({ userId, age: 30 }), {
    ageEligibilityConfirmedAt: null,
    ageEligibilityRejectedAt: date,
  });
});
