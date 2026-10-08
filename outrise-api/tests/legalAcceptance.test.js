import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import User from "../src/models/User.js";
import {
  TERMS_VERSION,
  PRIVACY_VERSION,
  legalDocuments,
} from "../src/config/legal.js";
import {
  validateLegalAcceptance,
  hasCurrentLegalAcceptance,
  acceptLegalDocuments,
} from "../src/services/legal.service.js";
import {
  authenticate,
  authenticateUnverified,
  authenticateAccountDeletion,
} from "../src/middleware/auth.js";
import { socketAuth } from "../src/middleware/socketAuth.js";
import { registerSchema } from "../src/middleware/validators/auth.validators.js";
import { registerUser } from "../src/services/auth.services.js";
import { getLegalDocumentsController } from "../src/controllers/legal.controller.js";
const versions = {
  accepted: true,
  termsVersion: TERMS_VERSION,
  privacyVersion: PRIVACY_VERSION,
};
const id = "507f1f77bcf86cd799439011";
const query = (value) => ({
  select() {
    return this;
  },
  then(resolve, reject) {
    return Promise.resolve(value).then(resolve, reject);
  },
});
const acceptance = {
  acceptedAt: new Date(),
  termsVersion: TERMS_VERSION,
  privacyVersion: PRIVACY_VERSION,
};
const member = (fields) => ({
  _id: id,
  role: "user",
  accountStatus: "active",
  emailVerified: true,
  ageEligibilityConfirmedAt: new Date(),
  ...fields,
});
test("registration rejects missing, unchecked, forged and stale consent before writes", async (t) => {
  t.mock.method(User, "findOne", () => assert.fail("must not access accounts"));
  for (const input of [
    {},
    { ...versions, accepted: false },
    { ...versions, accepted: "true" },
    { ...versions, termsVersion: "old" },
  ]) {
    await assert.rejects(
      registerUser({
        username: "Tester",
        email: "a@example.com",
        password: "password123",
        age: 18,
        ...input,
      }),
    );
  }
  for (const accepted of [false, "true", undefined])
    assert.ok(
      registerSchema.body.validate({
        username: "Tester",
        email: "a@example.com",
        password: "password123",
        age: 18,
        ...versions,
        accepted,
      }).error,
    );
  assert.doesNotThrow(() => validateLegalAcceptance(versions));
  assert.equal(
    hasCurrentLegalAcceptance({
      legalAcceptance: { ...acceptance, privacyVersion: "old" },
    }),
    false,
  );
});
test("existing acceptance records a server date and retry preserves it", async (t) => {
  let stored = member();
  t.mock.method(User, "findById", () => query(stored));
  t.mock.method(User, "findOneAndUpdate", (filter, update, options) => {
    assert.equal(filter.deletionRequestedAt, null);
    assert.equal(filter.ageEligibilityRejectedAt, null);
    assert.ok(update.$set.legalAcceptance.acceptedAt instanceof Date);
    assert.equal(options.returnDocument, "after");
    stored = { ...stored, ...update.$set };
    return query(stored);
  });
  const result = await acceptLegalDocuments({ userId: id, ...versions });
  assert.deepEqual(
    await acceptLegalDocuments({ userId: id, ...versions }),
    result,
  );
  assert.equal(User.findOneAndUpdate.mock.callCount(), 1);
});
test("a concurrent acceptance returns the winning saved timestamp", async (t) => {
  let count = 0;
  t.mock.method(User, "findById", () =>
    query(++count === 1 ? member() : member({ legalAcceptance: acceptance })),
  );
  t.mock.method(User, "findOneAndUpdate", () => query(null));
  assert.deepEqual(
    await acceptLegalDocuments({ userId: id, ...versions }),
    acceptance,
  );
});
test("age-restricted accounts cannot accept away their restriction", async (t) => {
  t.mock.method(User, "findById", () =>
    query(
      member({
        ageEligibilityConfirmedAt: null,
        ageEligibilityRejectedAt: new Date(),
      }),
    ),
  );
  await assert.rejects(
    acceptLegalDocuments({ userId: id, ...versions }),
    (error) => error.statusCode === 403,
  );
});
test("API and sockets require current database acceptance; account recovery and deletion stay available", async (t) => {
  const previous = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "legal-test-only";
  t.after(() => {
    if (previous === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previous;
  });
  let stored = member();
  t.mock.method(User, "findById", () => query(stored));
  const token = jwt.sign(
    { userId: id, legalAcceptance: acceptance },
    process.env.JWT_SECRET,
  );
  async function invoke(middleware) {
    let error;
    await middleware(
      { headers: { authorization: `Bearer ${token}` } },
      {},
      (e) => {
        error = e;
      },
    );
    return error;
  }
  assert.equal((await invoke(authenticate)).code, "LEGAL_ACCEPTANCE_REQUIRED");
  assert.equal(await invoke(authenticateUnverified), undefined);
  assert.equal(await invoke(authenticateAccountDeletion), undefined);
  let socketError;
  await socketAuth({ handshake: { auth: { token } }, data: {} }, (e) => {
    socketError = e;
  });
  assert.match(socketError.data.message, /Terms/);
  stored = member({ legalAcceptance: acceptance });
  assert.equal(await invoke(authenticate), undefined);
  stored.legalAcceptance = { ...acceptance, termsVersion: "old" };
  assert.equal((await invoke(authenticate)).code, "LEGAL_ACCEPTANCE_REQUIRED");
});
test("documents are readable publicly and versioned", () => {
  let body;
  const res = {
    set(name, value) {
      assert.equal(name, "Cache-Control");
      assert.equal(value, "no-store");
      return this;
    },
    status(code) {
      assert.equal(code, 200);
      return this;
    },
    json(value) {
      body = value;
    },
  };
  getLegalDocumentsController({}, res);
  assert.equal(body, legalDocuments);
  assert.ok(
    body.privacy.sections.some((section) =>
      section.body.includes("Cloudinary"),
    ),
  );
  assert.ok(
    body.terms.sections.some((section) => section.body.includes("injury")),
  );
});
