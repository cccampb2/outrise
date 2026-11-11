import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../src/models/User.js";
import RegistrationRequest from "../src/models/RegistrationRequest.js";
import RegistrationEmailLimit from "../src/models/RegistrationEmailLimit.js";
import {
  requestRegistration,
  confirmRegistration,
  resendRegistration,
  processRegistrationEmail,
} from "../src/services/registration.service.js";
import {
  register,
  confirmRegistrationController,
  login,
} from "../src/controllers/auth.controllers.js";
import { TERMS_VERSION, PRIVACY_VERSION } from "../src/config/legal.js";
import { confirmRegistrationSchema } from "../src/middleware/validators/auth.validators.js";
import logger from "../src/utils/logger.js";

const input = () => ({
  username: "NewMember",
  email: "member@example.com",
  password: "test-password",
  age: 25,
  accepted: true,
  termsVersion: TERMS_VERSION,
  privacyVersion: PRIVACY_VERSION,
});
const query = (value) => ({
  select() {
    return this;
  },
  session() {
    return this;
  },
  then(resolve, reject) {
    return Promise.resolve(value).then(resolve, reject);
  },
});
const response = () => ({
  statusCode: null,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});
function matches(row, filter) {
  return Object.entries(filter).every(([key, value]) => {
    if (key === "$or") return value.some((item) => matches(row, item));
    const actual = row[key];
    if (
      value &&
      typeof value === "object" &&
      !(value instanceof Date) &&
      !(value instanceof mongoose.Types.ObjectId)
    ) {
      return Object.entries(value).every(([op, v]) =>
        op === "$gt"
          ? actual > v
          : op === "$lte"
            ? actual <= v
            : op === "$lt"
              ? actual < v
              : op === "$ne"
                ? actual !== v
                : false,
      );
    }
    return String(actual) === String(value);
  });
}
function apply(row, update) {
  Object.assign(row, update.$set || {});
  for (const [field, amount] of Object.entries(update.$inc || {}))
    row[field] = (row[field] || 0) + amount;
}
function codeFor(draft) {
  const digest = createHmac("sha256", process.env.JWT_SECRET)
    .update(`registration-code:${draft.requestId}:${draft.generation}`)
    .digest();
  return String(digest.readUInt32BE(0) % 1000000).padStart(6, "0");
}
function fixture(t, existing = []) {
  const keys = [
    "JWT_SECRET",
    "JWT_EXPIRES_IN",
    "RESEND_API_KEY",
    "RESEND_ACCOUNT_EXISTS_TEMPLATE",
    "RESEND_EMAIL_VERIFICATION_TEMPLATE",
  ];
  const before = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  process.env.JWT_SECRET = "registration-tests-only";
  process.env.RESEND_API_KEY = "test-key-no-network";
  process.env.JWT_EXPIRES_IN = "45m";
  delete process.env.RESEND_ACCOUNT_EXISTS_TEMPLATE;
  delete process.env.RESEND_EMAIL_VERIFICATION_TEMPLATE;
  t.after(() => {
    for (const [k, v] of Object.entries(before)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });
  const drafts = [],
    users = [...existing],
    limits = [],
    deliveries = [],
    writes = [],
    warnings = [];
  let chain = Promise.resolve();
  const session = {
    withTransaction(fn) {
      const run = chain.then(fn);
      chain = run.catch(() => {});
      return run;
    },
    async endSession() {},
  };
  t.mock.method(mongoose, "startSession", async () => session);
  t.mock.method(bcrypt, "hash", async (_password, rounds) => {
    assert.equal(rounds, 12);
    return "hashed-password-only";
  });
  t.mock.method(bcrypt, "compare", async () => true);
  t.mock.method(RegistrationRequest, "create", async (value) => {
    const doc = new RegistrationRequest(value);
    await doc.validate();
    drafts.push(doc);
    return doc;
  });
  t.mock.method(RegistrationRequest, "findOne", (filter) =>
    query(drafts.find((row) => matches(row, filter)) || null),
  );
  t.mock.method(
    RegistrationRequest,
    "findOneAndUpdate",
    (filter, update, options) => {
      writes.push({ filter, update, options });
      const row = drafts.find((row) => matches(row, filter));
      if (row) apply(row, update);
      return query(row || null);
    },
  );
  t.mock.method(
    RegistrationRequest,
    "updateOne",
    async (filter, update, options) => {
      writes.push({ filter, update, options });
      const row = drafts.find((row) => matches(row, filter));
      if (row) apply(row, update);
      return { matchedCount: row ? 1 : 0 };
    },
  );
  t.mock.method(
    RegistrationEmailLimit,
    "findOneAndUpdate",
    async (filter, update) => {
      assert.ok(!JSON.stringify(filter).includes("member@example.com"));
      let row = limits.find((row) => matches(row, filter));
      if (!row && limits.some((row) => row.emailKey === filter.emailKey))
        throw Object.assign(new Error("duplicate"), { code: 11000 });
      if (!row) {
        row = { emailKey: filter.emailKey };
        limits.push(row);
      }
      apply(row, update);
      return row;
    },
  );
  t.mock.method(User, "findOne", (filter) =>
    query(users.find((row) => matches(row, filter)) || null),
  );
  t.mock.method(User, "findById", (id) =>
    query(users.find((row) => String(row._id) === String(id)) || null),
  );
  t.mock.method(User, "create", async (values, options) => {
    assert.equal(options.session, session);
    const user = new User(values[0]);
    await user.validate();
    users.push(user);
    return [user];
  });
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, "https://api.resend.com/emails");
    deliveries.push({
      payload: JSON.parse(options.body),
      key: options.headers["Idempotency-Key"],
    });
    return {
      ok: true,
      status: 200,
      json: async () => ({ id: "test-email-id" }),
    };
  });
  t.mock.method(logger, "warn", (...args) => warnings.push(args));
  return { drafts, users, deliveries, writes, warnings, limits };
}

test("registration has the same HTTP contract without account lookup or delivery", async (t) => {
  const f = fixture(t);
  t.mock.method(User, "findOne", () => assert.fail("no account lookup"));
  for (const email of ["new@example.com", "existing@example.com"]) {
    const res = response();
    await register({ body: { ...input(), email } }, res, (error) => {
      throw error;
    });
    assert.equal(res.statusCode, 202);
    assert.deepEqual(Object.keys(res.body).sort(), [
      "expiresInMinutes",
      "message",
      "requestId",
      "resendAfterSeconds",
    ]);
    assert.match(res.body.requestId, /^[a-f0-9]{48}$/);
    assert.equal(res.body.token, undefined);
    assert.equal(res.body.user, undefined);
  }
  assert.equal(f.users.length, 0);
  assert.equal(f.deliveries.length, 0);
  for (const draft of f.drafts) {
    assert.equal(draft.passwordHash, "hashed-password-only");
    assert.equal(draft.age, undefined);
    assert.equal(draft.password, undefined);
    assert.match(draft.codeHash, /^[a-f0-9]{64}$/);
  }
});
test("email confirmation creates a verified account and lost-response retry reuses it", async (t) => {
  const f = fixture(t);
  const result = await requestRegistration({
    ...input(),
    email: " Member@Example.com ",
  });
  assert.equal(f.users.length, 0);
  await processRegistrationEmail();
  const sent = f.deliveries[0].payload;
  assert.equal(sent.template.id, "email-verification");
  assert.deepEqual(sent.to, ["member@example.com"]);
  assert.equal(typeof sent.template.variables.EXPIRES_IN_MINUTES, "string");
  const code = sent.template.variables.VERIFICATION_CODE;
  assert.match(code, /^\d{6}$/);
  const req = {
    body: { requestId: result.requestId, email: "member@example.com", code },
  };
  for (let i = 0; i < 2; i++) {
    const res = response();
    await confirmRegistrationController(req, res, (error) => {
      throw error;
    });
    assert.equal(res.statusCode, 201);
    assert.equal(res.body.user.emailVerified, true);
    assert.equal(res.body.user.legalAcceptanceRequired, false);
    const claims = jwt.verify(res.body.token, process.env.JWT_SECRET);
    assert.equal(claims.userId, String(f.users[0]._id));
    assert.equal(claims.role, "user");
    assert.equal(claims.exp - claims.iat, 2700);
    assert.ok(!JSON.stringify(res.body).includes("hashed-password-only"));
  }
  assert.equal(f.users.length, 1);
  assert.equal(f.drafts[0].state, "completed");
  assert.deepEqual(
    f.users[0].legalAcceptance.toObject(),
    f.drafts[0].legalAcceptance.toObject(),
  );
  const res = response();
  await login(
    { body: { email: "member@example.com", password: "test-password" } },
    res,
    (error) => {
      throw error;
    },
  );
  assert.equal(res.statusCode, 200);
});
test("existing accounts receive a notice and cannot be overwritten or logged into", async (t) => {
  const existing = new User({
    username: "Original",
    email: "member@example.com",
    password: "original-hash",
    emailVerified: false,
    accountStatus: "banned",
  });
  const f = fixture(t, [existing]);
  const before = JSON.stringify(existing);
  const result = await requestRegistration(input());
  await processRegistrationEmail();
  assert.equal(f.deliveries[0].payload.template.id, "account-exists-notice");
  assert.equal(f.deliveries[0].payload.template.variables, undefined);
  assert.equal(JSON.stringify(existing), before);
  await assert.rejects(
    confirmRegistration({
      requestId: result.requestId,
      email: existing.email,
      code: codeFor(f.drafts[0]),
    }),
    /Invalid or expired/,
  );
  assert.equal(f.users.length, 1);
  assert.equal(JSON.stringify(existing), before);
});
test("wrong email, exhausted guesses, stale generation and expired codes fail", async (t) => {
  const f = fixture(t);
  const result = await requestRegistration(input());
  const draft = f.drafts[0];
  const code = codeFor(draft);
  await assert.rejects(
    confirmRegistration({
      requestId: result.requestId,
      email: "other@example.com",
      code,
    }),
    /Invalid or expired/,
  );
  const wrong = code === "000000" ? "000001" : "000000";
  for (let i = 0; i < 5; i++)
    await assert.rejects(
      confirmRegistration({
        requestId: result.requestId,
        email: draft.email,
        code: wrong,
      }),
      /Invalid or expired/,
    );
  assert.equal(draft.attempts, 5);
  await assert.rejects(
    confirmRegistration({
      requestId: result.requestId,
      email: draft.email,
      code,
    }),
    /Invalid or expired/,
  );
  draft.requestedAt = new Date(Date.now() - 61000);
  await resendRegistration({ requestId: result.requestId, email: draft.email });
  assert.equal(draft.attempts, 0);
  if (codeFor(draft) !== code)
    await assert.rejects(
      confirmRegistration({
        requestId: result.requestId,
        email: draft.email,
        code,
      }),
      /Invalid or expired/,
    );
  draft.expiresAt = new Date(Date.now() - 1);
  await assert.rejects(
    confirmRegistration({
      requestId: result.requestId,
      email: draft.email,
      code: codeFor(draft),
    }),
    /Invalid or expired/,
  );
  assert.equal(f.users.length, 0);
});
test("resend cooldown and absent requests respond identically", async (t) => {
  const f = fixture(t);
  const result = await requestRegistration(input());
  const draft = f.drafts[0];
  const generation = draft.generation;
  const one = await resendRegistration({
    requestId: result.requestId,
    email: draft.email,
  });
  assert.equal(draft.generation, generation);
  const two = await resendRegistration({
    requestId: "f".repeat(48),
    email: draft.email,
  });
  assert.deepEqual(
    { ...one, requestId: "opaque" },
    { ...two, requestId: "opaque" },
  );
  draft.requestedAt = new Date(Date.now() - 61000);
  draft.state = "completed";
  await resendRegistration({ requestId: result.requestId, email: draft.email });
  assert.equal(draft.generation, generation);
});
test("per-address delivery cooldown survives multiple registration requests", async (t) => {
  const f = fixture(t);
  await requestRegistration(input());
  await requestRegistration(input());
  await processRegistrationEmail();
  await processRegistrationEmail();
  assert.equal(f.deliveries.length, 1);
  assert.equal(f.limits.length, 1);
  assert.equal(f.limits[0].email, undefined);
  assert.match(f.limits[0].emailKey, /^[a-f0-9]{64}$/);
});
test("email timeout retries keep the exact payload and idempotency key", async (t) => {
  const f = fixture(t);
  await requestRegistration(input());
  const calls = [];
  t.mock.method(globalThis, "fetch", async (_url, options) => {
    calls.push({ body: options.body, key: options.headers["Idempotency-Key"] });
    if (calls.length === 1)
      throw Object.assign(new Error("private-email secret"), {
        name: "TimeoutError",
      });
    return { ok: true, status: 200, json: async () => ({ id: "accepted" }) };
  });
  await processRegistrationEmail();
  assert.equal(f.drafts[0].state, "queued");
  assert.equal(f.warnings[0][1].reason, "NETWORK_TIMEOUT");
  assert.ok(!JSON.stringify(f.warnings).includes("private-email"));
  f.drafts[0].nextAttemptAt = new Date(Date.now() - 1);
  await processRegistrationEmail();
  assert.deepEqual(calls[0], calls[1]);
  assert.equal(f.drafts[0].state, "sent");
});
test("username conflicts and stale legal consent are checked after proof", async (t) => {
  const f = fixture(t, [
    new User({
      username: "NewMember",
      email: "someone@example.com",
      password: "hash",
    }),
  ]);
  const result = await requestRegistration(input());
  const draft = f.drafts[0];
  await assert.rejects(
    confirmRegistration({
      requestId: result.requestId,
      email: draft.email,
      code: codeFor(draft),
    }),
    /username is unavailable/,
  );
  draft.legalAcceptance.termsVersion = "old";
  await assert.rejects(
    confirmRegistration({
      requestId: result.requestId,
      email: draft.email,
      code: codeFor(draft),
    }),
    /legal documents/,
  );
  assert.equal(f.users.length, 1);
});
test("concurrent confirmations lock one request and create one user", async (t) => {
  const f = fixture(t);
  const result = await requestRegistration(input());
  const draft = f.drafts[0];
  const args = {
    requestId: result.requestId,
    email: draft.email,
    code: codeFor(draft),
  };
  const [one, two] = await Promise.all([
    confirmRegistration(args),
    confirmRegistration(args),
  ]);
  assert.equal(String(one._id), String(two._id));
  assert.equal(f.users.length, 1);
  const locks = f.writes.filter((w) => w.update.$inc?.revision);
  assert.equal(locks.length, 2);
  for (const lock of locks) {
    assert.ok(lock.options.session);
    assert.equal(lock.filter.generation, draft.generation);
    assert.deepEqual(lock.filter.attempts, { $lt: 5 });
  }
});
test("temporary records hide credentials and have TTL indexes; confirm input is strict", () => {
  for (const key of [
    "email",
    "username",
    "passwordHash",
    "generation",
    "codeHash",
    "completedUser",
    "leaseToken",
  ])
    assert.equal(RegistrationRequest.schema.path(key).options.select, false);
  assert.ok(
    RegistrationRequest.schema
      .indexes()
      .some(
        ([keys, options]) =>
          keys.expiresAt === 1 && options.expireAfterSeconds === 0,
      ),
  );
  assert.ok(
    RegistrationEmailLimit.schema
      .indexes()
      .some(([keys, options]) => keys.emailKey === 1 && options.unique),
  );
  assert.ok(
    confirmRegistrationSchema.body.validate({
      email: "a@example.com",
      requestId: "bad",
      code: "123456",
    }).error,
  );
  assert.ok(
    !confirmRegistrationSchema.body.validate({
      email: "a@example.com",
      requestId: "a".repeat(48),
      code: "123456",
    }).error,
  );
});

test("completed registration cannot restore a session after token revocation", async (t) => {
  const f = fixture(t);
  const result = await requestRegistration(input());
  const draft = f.drafts[0];
  const args = {
    requestId: result.requestId,
    email: draft.email,
    code: codeFor(draft),
  };
  await confirmRegistration(args);
  f.users[0].tokenVersion = 1;
  await assert.rejects(confirmRegistration(args), /Invalid or expired/);
  assert.equal(f.users.length, 1);
});
