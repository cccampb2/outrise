import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import mongoose from "mongoose";
import User from "../src/models/User.js";
import { requestEmailVerification, verifyEmail } from "../src/services/emailVerification.service.js";
import { getEmailVerificationEmailConfig, sendEmailVerificationEmail } from "../src/services/email.service.js";

// Restore a prior replacement before remocking the same method. This keeps
// Node 20's mock restoration order from leaking a previous test's replacement.
function mockMethod(t, target, name, implementation) {
  target[name].mock?.restore();
  return t.mock.method(target, name, implementation);
}

const id = new mongoose.Types.ObjectId();
const otherId = new mongoose.Types.ObjectId();
const email = "member@example.com";
const verificationId = "a".repeat(32);
const query = (value, selected = () => {}) => ({
  select(fields) { selected(fields); return this; },
  then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); },
});
const codeHash = (code, vid = verificationId, address = email) => createHmac("sha256", process.env.JWT_SECRET)
  .update(`email-verification:${vid}:${address}:${code}`).digest("hex");
const currentVerification = (code = "042817") => ({
  id: verificationId, codeHash: codeHash(code), expiresAt: new Date(Date.now() + 60000), attempts: 0,
});
const account = (verification = currentVerification()) => ({
  _id: id, email, username: "tester", emailVerified: false, emailVerification: verification,
});

function environment(t) {
  const keys = ["JWT_SECRET", "RESEND_API_KEY", "RESEND_EMAIL_VERIFICATION_TEMPLATE", "EMAIL_FROM"];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  process.env.JWT_SECRET = "email-verification-tests-only";
  process.env.RESEND_API_KEY = "test-key-never-sent";
  delete process.env.RESEND_EMAIL_VERIFICATION_TEMPLATE;
  delete process.env.EMAIL_FROM;
  t.after(() => keys.forEach((key) => {
    if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key];
  }));
  const emails = [];
  mockMethod(t, globalThis, "fetch", async (url, options) => {
    assert.equal(url, "https://api.resend.com/emails");
    emails.push({ payload: JSON.parse(options.body), headers: options.headers });
    return { ok: true, status: 200, json: async () => ({ id: "mock-email-id" }) };
  });
  return emails;
}

function clone(value) {
  return value ? { ...structuredClone(value), _id: value._id } : value;
}

// Minimal document operations let parallel requests exercise conditional writes
// without an external database. Actual Mongoose casting is covered below.
const pathValue = (document, path) => path.split(".").reduce((value, key) => value?.[key], document);
function matches(document, filter) {
  if (!document) return false;
  return Object.entries(filter).every(([path, expected]) => {
    if (path === "$or") return expected.some((condition) => matches(document, condition));
    const actual = pathValue(document, path);
    if (expected && typeof expected === "object" && !(expected instanceof Date) && !expected._bsontype) {
      return Object.entries(expected).every(([operator, value]) => {
        if (operator === "$exists") return (actual !== undefined) === value;
        if (operator === "$ne") return actual !== value;
        if (operator === "$lt") return actual < value;
        if (operator === "$lte") return actual <= value;
        if (operator === "$gt") return actual > value;
        assert.fail(`Unsupported test operator: ${operator}`);
      });
    }
    return actual?.toString() === expected?.toString();
  });
}
function change(document, update) {
  for (const [path, value] of Object.entries(update.$set || {})) {
    // The driver serializes cast Mongoose subdocuments via their BSON methods.
    document[path] = typeof value?.toObject === "function" ? value.toObject() : value;
  }
  for (const path of Object.keys(update.$unset || {})) delete document[path];
  for (const [path, value] of Object.entries(update.$inc || {})) {
    const parts = path.split(".");
    const key = parts.pop();
    const parent = parts.reduce((result, part) => result[part], document);
    parent[key] = (parent[key] || 0) + value;
  }
}
function fakeDatabase(t, initial) {
  let stored = initial;
  mockMethod(t, User, "findOne", (filter) => query(matches(stored, filter) ? clone(stored) : null));
  mockMethod(t, User, "findOneAndUpdate", (filter, update) => {
    if (!matches(stored, filter)) return query(null);
    change(stored, update);
    return query(clone(stored));
  });
  mockMethod(t, User, "updateOne", async (filter, update) => {
    if (!matches(stored, filter)) return { modifiedCount: 0 };
    change(stored, update);
    return { modifiedCount: 1 };
  });
  return { get stored() { return stored; }, replace(value) { stored = value; } };
}

test("verification state is hidden, unverified by default, and validates request/hash/expiry/guess bounds", async () => {
  assert.equal(User.schema.path("emailVerified").defaultValue, false);
  for (const field of ["emailVerification", "emailVerificationRequestedAt"]) {
    assert.equal(User.schema.path(field).options.select, false);
  }
  const user = new User({ username: "tester", email, password: "existing-hash", emailVerification: {
    id: "bad", codeHash: "plaintext-code", expiresAt: "invalid date", attempts: 6,
  } });
  await assert.rejects(() => user.validate(), (error) => {
    for (const field of ["id", "codeHash", "expiresAt", "attempts"]) {
      assert.ok(error.errors[`emailVerification.${field}`]);
    }
    return true;
  });
});

test("request stores a purpose-bound hash before sending the template with string variables and no code in its response", async (t) => {
  const emails = environment(t);
  let saved;
  mockMethod(t, User, "findOne", (filter) => {
    assert.deepEqual(filter, { _id: id });
    return query({ ...account(), firstName: "<Alex & Co>" });
  });
  mockMethod(t, User, "findOneAndUpdate", (filter, update, options) => {
    assert.equal(filter._id, id);
    assert.equal(filter.email, email);
    assert.deepEqual(filter.emailVerified, { $ne: true });
    assert.equal(filter.$or[2].emailVerificationRequestedAt.$lte.getTime(), update.$set.emailVerificationRequestedAt.getTime() - 60000);
    assert.equal(options.returnDocument, "after");
    assert.equal(options.runValidators, true);
    saved = update.$set.emailVerification;
    assert.equal(saved.attempts, 0);
    assert.equal(saved.expiresAt.getTime(), update.$set.emailVerificationRequestedAt.getTime() + 600000);
    return query({ ...account(), firstName: "<Alex & Co>" });
  });
  const result = await requestEmailVerification({ userId: id, email: "attacker@example.com" });
  assert.equal(result.emailVerified, false);
  assert.equal(result.resendAfterSeconds, 60);
  assert.equal(result.expiresInMinutes, 10);
  assert.equal(emails.length, 1);
  const sent = emails[0].payload;
  assert.equal(sent.template.id, "email-verification");
  assert.deepEqual(sent.to, [email]);
  assert.deepEqual(Object.keys(sent.template.variables), ["RECIPIENT_NAME", "VERIFICATION_CODE", "EXPIRES_IN_MINUTES"]);
  assert.equal(sent.template.variables.RECIPIENT_NAME, "&lt;Alex &amp; Co&gt;");
  assert.equal(sent.template.variables.EXPIRES_IN_MINUTES, "10");
  assert.match(sent.template.variables.VERIFICATION_CODE, /^\d{6}$/);
  assert.ok(Object.values(sent.template.variables).every((value) => typeof value === "string"));
  assert.match(saved.id, /^[a-f0-9]{32}$/);
  assert.equal(saved.codeHash, codeHash(sent.template.variables.VERIFICATION_CODE, saved.id));
  const resetPurposeHash = createHmac("sha256", process.env.JWT_SECRET)
    .update(`password-reset:${saved.id}:${email}:${sent.template.variables.VERIFICATION_CODE}`).digest("hex");
  assert.notEqual(saved.codeHash, resetPurposeHash);
  assert.equal(saved.code, undefined);
  assert.equal(result.code, undefined);
  assert.equal(result.emailVerification, undefined);
  assert.equal(emails[0].headers["Idempotency-Key"], `email-verification/${saved.id}`);
});

test("authenticated requests await delivery; a timeout keeps the saved code usable and returns only a safe error", async (t) => {
  environment(t);
  const database = fakeDatabase(t, account());
  let rejectSend;
  let sentCode;
  let completed = false;
  mockMethod(t, globalThis, "fetch", (url, options) => new Promise((resolve, reject) => {
    sentCode = JSON.parse(options.body).template.variables.VERIFICATION_CODE;
    rejectSend = reject;
  }));
  const request = requestEmailVerification({ userId: id });
  request.then(() => { completed = true; }, () => { completed = true; });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(completed, false);
  const timeout = new Error("private@example.com 000123 secret-api-key");
  timeout.name = "TimeoutError";
  rejectSend(timeout);
  await assert.rejects(request, (error) => {
    assert.equal(error.statusCode, 502);
    assert.equal(error.retryAfterSeconds, 60);
    assert.equal(error.deliveryFailure.reason, "NETWORK_TIMEOUT");
    assert.match(error.message, /could not confirm delivery/i);
    for (const secret of ["private@example.com", "000123", "secret-api-key"]) assert.ok(!JSON.stringify(error).includes(secret));
    return true;
  });
  assert.match(database.stored.emailVerification.codeHash, /^[a-f0-9]{64}$/);
  assert.ok(database.stored.emailVerification.expiresAt > new Date());
  assert.equal(User.updateOne.mock.callCount(), 0);
  assert.equal((await verifyEmail({ userId: id, code: sentCode })).emailVerified, true);
});

test("verified requests do no writes/sends/config checks, and missing email/JWT configuration never saves a request", async (t) => {
  environment(t);
  const database = fakeDatabase(t, { ...account(), emailVerified: true });
  delete process.env.RESEND_API_KEY;
  delete process.env.JWT_SECRET;
  assert.equal((await requestEmailVerification({ userId: id })).alreadyVerified, true);
  assert.equal(User.findOneAndUpdate.mock.callCount(), 0);
  assert.equal(globalThis.fetch.mock.callCount(), 0);
  database.stored.emailVerified = false;
  await assert.rejects(() => requestEmailVerification({ userId: id }), (error) => error.statusCode === 503);
  process.env.RESEND_API_KEY = "test-key-never-sent";
  await assert.rejects(() => requestEmailVerification({ userId: id }), (error) => error.statusCode === 503);
  assert.equal(User.findOneAndUpdate.mock.callCount(), 0);
});

test("atomic cooldown permits one concurrent email; a resend after a minute replaces the old code", async (t) => {
  const emails = environment(t);
  const database = fakeDatabase(t, account());
  const results = await Promise.allSettled(Array.from({ length: 12 }, () => requestEmailVerification({ userId: id })));
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  for (const result of results.filter((result) => result.status === "rejected")) {
    assert.equal(result.reason.statusCode, 429);
    assert.ok(result.reason.retryAfterSeconds > 0 && result.reason.retryAfterSeconds <= 60);
  }
  assert.equal(emails.length, 1);
  const claimCount = User.findOneAndUpdate.mock.callCount();
  await assert.rejects(() => requestEmailVerification({ userId: id }), (error) => error.statusCode === 429 && error.retryAfterSeconds > 0 && error.retryAfterSeconds <= 60);
  assert.equal(User.findOneAndUpdate.mock.callCount(), claimCount);
  database.stored.emailVerificationRequestedAt = new Date(Date.now() - 23000);
  await assert.rejects(() => requestEmailVerification({ userId: id }), (error) => {
    assert.equal(error.statusCode, 429);
    assert.ok(error.retryAfterSeconds >= 36 && error.retryAfterSeconds <= 37);
    return true;
  });
  const first = clone(database.stored);
  const firstCode = emails[0].payload.template.variables.VERIFICATION_CODE;
  database.stored.emailVerificationRequestedAt = new Date(Date.now() - 60001);
  await requestEmailVerification({ userId: id });
  assert.equal(emails.length, 2);
  assert.notEqual(database.stored.emailVerification.id, first.emailVerification.id);
  // Random generation may repeat the same six digits; a distinct old code still
  // cannot validate because the new request has its own id/hash.
  const newCode = emails[1].payload.template.variables.VERIFICATION_CODE;
  if (firstCode !== newCode) await assert.rejects(() => verifyEmail({ userId: id, code: firstCode }), /Invalid or expired/);
  assert.equal((await verifyEmail({ userId: id, code: newCode })).emailVerified, true);
});

test("wrong-code updates stay bounded at five under concurrent guesses and never touch another account or password", async (t) => {
  environment(t);
  const database = fakeDatabase(t, { ...account(), password: "existing-hash", tokenVersion: 3, role: "user" });
  const results = await Promise.allSettled(Array.from({ length: 15 }, () => verifyEmail({ userId: id, code: "999999", email: "attacker@example.com" })));
  assert.ok(results.every((result) => result.status === "rejected" && /Invalid or expired/.test(result.reason.message)));
  assert.equal(database.stored.emailVerification.attempts, 5);
  await assert.rejects(() => verifyEmail({ userId: id, code: "042817" }), /Invalid or expired/);
  assert.equal(User.findOneAndUpdate.mock.callCount(), 0);
  assert.equal(database.stored.password, "existing-hash");
  assert.equal(database.stored.tokenVersion, 3);
  assert.equal(database.stored.emailVerified, false);
  await assert.rejects(() => verifyEmail({ userId: otherId, code: "042817" }), /Invalid or expired/);
  assert.equal(database.stored.emailVerification.attempts, 5);
});

test("expired, absent, exhausted, unknown and malformed codes fail without verification updates", async (t) => {
  environment(t);
  const database = fakeDatabase(t, null);
  for (const value of [null, { ...account(), emailVerification: undefined }, { ...account(), emailVerification: { ...currentVerification(), expiresAt: new Date(Date.now() - 1) } }, { ...account(), emailVerification: { ...currentVerification(), attempts: 5 } }]) {
    database.replace(value);
    await assert.rejects(() => verifyEmail({ userId: id, code: "042817" }), /Invalid or expired/);
  }
  for (const code of [42817, "12345", "1234567", " 042817", "042817\n", undefined]) {
    await assert.rejects(() => verifyEmail({ userId: id, code }), (error) => error.statusCode === 400);
  }
  assert.equal(User.findOneAndUpdate.mock.callCount(), 0);
  assert.equal(User.updateOne.mock.callCount(), 0);
});

test("valid verification consumes the request once, preserves password/token state, and tolerates concurrent duplicates", async (t) => {
  const emails = environment(t);
  const database = fakeDatabase(t, { ...account(), password: "existing-hash", tokenVersion: 3, passwordReset: { id: "b".repeat(32) } });
  const results = await Promise.all(Array.from({ length: 8 }, () => verifyEmail({ userId: id, code: "042817" })));
  assert.ok(results.every((result) => result.emailVerified === true));
  assert.equal(database.stored.emailVerified, true);
  assert.equal(database.stored.emailVerification, undefined);
  assert.equal(database.stored.password, "existing-hash");
  assert.equal(database.stored.tokenVersion, 3);
  assert.equal(database.stored.passwordReset.id, "b".repeat(32));
  assert.equal((await verifyEmail({ userId: id, code: "042817" })).alreadyVerified, true);
  assert.equal(emails.length, 0);
  for (const result of results) {
    assert.equal(result.code, undefined);
    assert.equal(result.tokenVersion, undefined);
  }
});

test("stale valid and wrong guesses cannot consume or increment a newer request", async (t) => {
  environment(t);
  const original = account();
  const newer = currentVerification("000123");
  newer.id = "b".repeat(32);
  newer.codeHash = codeHash("000123", newer.id);
  const database = fakeDatabase(t, clone(original));
  const originalFind = User.findOne;
  mockMethod(t, User, "findOne", (filter) => {
    const result = originalFind(filter);
    database.stored.emailVerification = clone(newer);
    return result;
  });
  await assert.rejects(() => verifyEmail({ userId: id, code: "042817" }), /Invalid or expired/);
  assert.equal(database.stored.emailVerified, false);
  assert.equal(database.stored.emailVerification.id, newer.id);
  assert.equal(database.stored.emailVerification.attempts, 0);
  database.replace(clone(original));
  await assert.rejects(() => verifyEmail({ userId: id, code: "999999" }), /Invalid or expired/);
  assert.equal(database.stored.emailVerification.attempts, 0);
});

test("request/verification lost conditional writes detect verified accounts and reject email changes", async (t) => {
  const emails = environment(t);
  const database = fakeDatabase(t, account());
  const originalFind = User.findOne;
  let mutate = () => { database.stored.emailVerified = true; };
  mockMethod(t, User, "findOne", (filter) => {
    const result = originalFind(filter);
    mutate();
    return result;
  });
  assert.equal((await requestEmailVerification({ userId: id })).alreadyVerified, true);
  assert.equal(emails.length, 0);
  database.replace(account());
  mutate = () => { database.stored.email = "changed@example.com"; };
  await assert.rejects(() => requestEmailVerification({ userId: id }), /could not be completed/);
  assert.equal(emails.length, 0);
  database.replace(account());
  await assert.rejects(() => verifyEmail({ userId: id, code: "042817" }), /Invalid or expired/);
  assert.equal(database.stored.emailVerified, false);
});

test("verification email alias override and leading zeros are preserved; provider diagnostics exclude raw values", async (t) => {
  const emails = environment(t);
  assert.equal(getEmailVerificationEmailConfig().templateId, "email-verification");
  process.env.RESEND_EMAIL_VERIFICATION_TEMPLATE = "custom-email-verification";
  await sendEmailVerificationEmail({ to: email, recipientName: "<Tester>", code: "000123", expiresInMinutes: 10, verificationId });
  assert.equal(emails[0].payload.template.id, "custom-email-verification");
  assert.equal(emails[0].payload.template.variables.VERIFICATION_CODE, "000123");
  assert.equal(emails[0].payload.template.variables.EXPIRES_IN_MINUTES, "10");
  mockMethod(t, globalThis, "fetch", async () => ({ ok: false, status: 422, json: async () => ({ name: "validation_error", message: "Variable invalid; private@example.com 000123 secret-api-key" }) }));
  await assert.rejects(() => sendEmailVerificationEmail({ to: email, code: "000123", expiresInMinutes: 10, verificationId }), (error) => {
    assert.deepEqual(error.deliveryFailure, { reason: "TEMPLATE_VARIABLES_INVALID", httpStatus: 422, providerCode: "validation_error" });
    for (const secret of ["private@example.com", "000123", "secret-api-key"]) assert.ok(!JSON.stringify(error).includes(secret));
    return true;
  });
});

// Real Mongoose casting/validators execute; only collection I/O and Resend are
// mocked. This catches unknown schema fields being stripped during updates.
test("full verification runs through Mongoose casting and consumes hidden state without changing credentials", async (t) => {
  const emails = environment(t);
  let stored = { _id: id, username: "tester", email, emailVerified: false, password: "existing-hash", tokenVersion: 2 };
  mockMethod(t, User.collection, "findOne", async () => clone(stored));
  mockMethod(t, User.collection, "findOneAndUpdate", async (filter, update, options) => {
    assert.equal(options.returnDocument, "after");
    assert.ok(filter._id instanceof mongoose.Types.ObjectId);
    assert.deepEqual(filter.emailVerified, { $ne: true });
    if (update.$set?.emailVerification) {
      assert.match(update.$set.emailVerification.codeHash, /^[a-f0-9]{64}$/);
      assert.ok(update.$set.emailVerification.expiresAt instanceof Date);
      assert.equal(options.projection.email, 1);
    } else {
      assert.equal(filter["emailVerification.id"], stored.emailVerification.id);
      assert.equal(filter["emailVerification.codeHash"], stored.emailVerification.codeHash);
      assert.ok(filter["emailVerification.expiresAt"].$gt instanceof Date);
      assert.equal(filter["emailVerification.attempts"].$lt, 5);
      assert.equal(update.$set.emailVerified, true);
      assert.deepEqual(Object.keys(update.$set).sort(), ["emailVerified", "updatedAt"]);
      assert.deepEqual(update.$unset, { emailVerification: "" });
      assert.equal(update.$inc, undefined);
    }
    change(stored, update);
    return clone(stored);
  });
  await requestEmailVerification({ userId: id.toString() });
  const code = emails[0].payload.template.variables.VERIFICATION_CODE;
  assert.equal(stored.emailVerification.codeHash, codeHash(code, stored.emailVerification.id));
  assert.ok(!JSON.stringify(stored).includes(`"${code}"`));
  assert.equal((await verifyEmail({ userId: id.toString(), code })).emailVerified, true);
  assert.equal(stored.emailVerification, undefined);
  assert.equal(stored.password, "existing-hash");
  assert.equal(stored.tokenVersion, 2);
});
