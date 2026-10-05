import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../src/models/User.js";
import {
  requestPasswordReset,
  resetPassword,
} from "../src/services/passwordReset.service.js";
import {
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
} from "../src/services/email.service.js";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  registerSchema,
} from "../src/middleware/validators/auth.validators.js";
import { createPasswordResetLimiter } from "../src/middleware/passwordResetRateLimit.js";
import { authenticate } from "../src/middleware/auth.js";
import { errorHandler } from "../src/middleware/errorHandler.js";
import { loginUser } from "../src/services/auth.services.js";
import {
  login,
  forgotPassword,
  resetPasswordController,
} from "../src/controllers/auth.controllers.js";
import authRoutes from "../src/routes/auth.routes.js";
import logger from "../src/utils/logger.js";

const query = (value, selected = () => {}) => ({
  select(fields) {
    selected(fields);
    return this;
  },
  then(resolve, reject) {
    return Promise.resolve(value).then(resolve, reject);
  },
});
const tick = () => new Promise((resolve) => setImmediate(resolve));
const resetId = "a".repeat(32);
const id = new mongoose.Types.ObjectId();
const email = "member@example.com";
const password = "new password 123";
const resetInput = (code = "042817") => ({
  email,
  code,
  password,
  confirmPassword: password,
});
const codeHash = (code, rid = resetId) =>
  createHmac("sha256", process.env.JWT_SECRET)
    .update(`password-reset:${rid}:${email}:${code}`)
    .digest("hex");
const currentReset = (code = "042817") => ({
  id: resetId,
  codeHash: codeHash(code),
  expiresAt: new Date(Date.now() + 60000),
  attempts: 0,
});

function environment(t) {
  const keys = [
    "JWT_SECRET",
    "RESEND_API_KEY",
    "RESEND_PASSWORD_RESET_TEMPLATE",
    "EMAIL_FROM",
  ];
  const previous = Object.fromEntries(
    keys.map((key) => [key, process.env[key]]),
  );
  process.env.JWT_SECRET = "password-reset-tests-only";
  process.env.RESEND_API_KEY = "test-key-never-sent";
  delete process.env.RESEND_PASSWORD_RESET_TEMPLATE;
  delete process.env.EMAIL_FROM;
  t.after(() =>
    keys.forEach((key) => {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }),
  );
  const emails = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, "https://api.resend.com/emails");
    emails.push({
      payload: JSON.parse(options.body),
      headers: options.headers,
    });
    return { ok: true, json: async () => ({ id: "mock-email-id" }) };
  });
  t.mock.method(logger, "warn", () => {});
  return emails;
}

function response() {
  return {
    statusCode: undefined,
    body: undefined,
    headers: {},
    status(value) {
      this.statusCode = value;
      return this;
    },
    json(value) {
      this.body = value;
      return this;
    },
    set(key, value) {
      this.headers[key] = value;
      return this;
    },
  };
}

test("reset fields are hidden and validate hash format, expiry and attempt limits", async () => {
  for (const field of [
    "passwordReset",
    "passwordResetRequestedAt",
    "tokenVersion",
  ]) {
    assert.equal(User.schema.path(field).options.select, false);
  }
  const user = new User({
    username: "tester",
    email,
    password: "hash",
    passwordReset: {
      id: resetId,
      codeHash: "b".repeat(64),
      expiresAt: new Date(),
      attempts: 0,
    },
  });
  assert.equal(user.tokenVersion, 0);
  await user.validate();
  user.passwordReset.attempts = 6;
  await assert.rejects(() => user.validate(), /attempts/);
  user.passwordReset.attempts = 0;
  user.passwordReset.codeHash = "042817";
  await assert.rejects(() => user.validate(), /codeHash/);
});

test("public reset routes validate email, string codes, matching passwords, bcrypt byte limits and injected fields", () => {
  assert.equal(
    forgotPasswordSchema.body.validate({ email: " Member@Example.com " }).value
      .email,
    email,
  );
  for (const data of [{ email: "invalid" }, { email, role: "owner" }]) {
    assert.ok(forgotPasswordSchema.body.validate(data).error);
  }
  assert.equal(
    resetPasswordSchema.body.validate(resetInput()).error,
    undefined,
  );
  for (const data of [
    resetInput("12345"),
    resetInput("1234567"),
    { ...resetInput(), code: 42817 },
    { ...resetInput(), password: "short", confirmPassword: "short" },
    { ...resetInput(), confirmPassword: "different password" },
    {
      ...resetInput(),
      password: "a".repeat(73),
      confirmPassword: "a".repeat(73),
    },
    {
      ...resetInput(),
      password: "🔒".repeat(19),
      confirmPassword: "🔒".repeat(19),
    },
    { ...resetInput(), tokenVersion: 0 },
  ])
    assert.ok(resetPasswordSchema.body.validate(data).error);
  assert.ok(
    registerSchema.body.validate({
      username: "tester",
      email,
      password: "a".repeat(73),
    }).error,
  );
  for (const path of ["/forgot-password", "/reset-password"]) {
    const route = authRoutes.stack.find(
      (layer) => layer.route?.path === path,
    ).route;
    assert.equal(route.methods.post, true);
    assert.equal(route.stack.length, 3); // limiter, validation, controller
  }
});

test("request saves only a keyed code hash before sending the published template and uses an atomic per-account cooldown", async (t) => {
  const emails = environment(t);
  let saved;
  t.mock.method(User, "findOneAndUpdate", (filter, update, options) => {
    assert.equal(filter.email, email);
    assert.equal(
      filter.$or[2].passwordResetRequestedAt.$lte.getTime(),
      update.$set.passwordResetRequestedAt.getTime() - 60000,
    );
    assert.equal(options.returnDocument, "after");
    assert.equal(options.runValidators, true);
    saved = update.$set.passwordReset;
    assert.equal(saved.attempts, 0);
    assert.equal(
      saved.expiresAt.getTime(),
      update.$set.passwordResetRequestedAt.getTime() + 600000,
    );
    return query({ _id: id, email, firstName: "<Alex & Co>" });
  });
  const result = await requestPasswordReset({ email: " MEMBER@EXAMPLE.COM " });
  await tick();
  assert.equal(result.resendAfterSeconds, 60);
  assert.equal(result.expiresInMinutes, 10);
  assert.equal(emails.length, 1);
  const sent = emails[0].payload;
  assert.equal(sent.template.id, "password-reset");
  assert.deepEqual(sent.to, [email]);
  assert.equal(sent.template.variables.RECIPIENT_NAME, "&lt;Alex &amp; Co&gt;");
  assert.equal(sent.template.variables.EXPIRES_IN_MINUTES, "10");
  assert.match(sent.template.variables.RESET_CODE, /^\d{6}$/);
  assert.equal(
    saved.codeHash,
    codeHash(sent.template.variables.RESET_CODE, saved.id),
  );
  assert.equal(saved.code, undefined);
  assert.equal(result.code, undefined);
  assert.equal(
    emails[0].headers["Idempotency-Key"],
    `password-reset/${saved.id}`,
  );
});

test("unknown and cooldown requests return the same result without email and do not await provider delivery", async (t) => {
  environment(t);
  let user = { _id: id, email, username: "tester" };
  let providerResolve;
  t.mock.method(
    globalThis,
    "fetch",
    () =>
      new Promise((resolve) => {
        providerResolve = resolve;
      }),
  );
  t.mock.method(User, "findOneAndUpdate", () => query(user));
  const existing = await requestPasswordReset({ email });
  assert.ok(providerResolve); // request completed while provider is still pending
  user = null;
  const unknown = await requestPasswordReset({ email });
  assert.deepEqual(unknown, existing);
  providerResolve({ ok: true, json: async () => ({ id: "mock-id" }) });
  await tick();
});

test("uncertain delivery leaves the saved code usable; missing configuration fails uniformly before querying users", async (t) => {
  environment(t);
  let saved;
  t.mock.method(User, "findOneAndUpdate", (filter, update) => {
    saved = update.$set.passwordReset;
    return query({ _id: id, email });
  });
  t.mock.method(User, "updateOne", () =>
    assert.fail("An accepted-but-timed-out send must not invalidate the code"),
  );
  t.mock.method(globalThis, "fetch", async () => {
    throw new Error("private provider data");
  });
  await requestPasswordReset({ email });
  await tick();
  assert.ok(saved.codeHash);
  assert.ok(saved.expiresAt > new Date());
  delete process.env.RESEND_API_KEY;
  await assert.rejects(
    () => requestPasswordReset({ email }),
    (error) => error.statusCode === 503,
  );
  assert.equal(User.findOneAndUpdate.mock.callCount(), 1);
});

test("incorrect codes increment bounded guesses atomically and never change password, role or status", async (t) => {
  environment(t);
  const reset = currentReset();
  t.mock.method(User, "findOne", () =>
    query({ _id: id, passwordReset: reset }),
  );
  t.mock.method(User, "updateOne", async (filter, update) => {
    assert.equal(filter["passwordReset.id"], resetId);
    assert.equal(filter["passwordReset.attempts"].$lt, 5);
    assert.ok(filter["passwordReset.expiresAt"].$gt instanceof Date);
    assert.deepEqual(update, { $inc: { "passwordReset.attempts": 1 } });
  });
  t.mock.method(User, "findOneAndUpdate", () =>
    assert.fail("Must not change password"),
  );
  t.mock.method(bcrypt, "hash", () =>
    assert.fail("Wrong code must not run bcrypt"),
  );
  await assert.rejects(
    () => resetPassword(resetInput("999999")),
    /Invalid or expired/,
  );
  assert.equal(User.updateOne.mock.callCount(), 1);
});

test("expired, consumed, unknown and exhausted codes share an error without updates; validation cannot bypass the password policy", async (t) => {
  environment(t);
  let user;
  t.mock.method(User, "findOne", () => query(user));
  t.mock.method(User, "updateOne", () => assert.fail("No attempts to count"));
  t.mock.method(User, "findOneAndUpdate", () => assert.fail("No valid code"));
  for (const value of [
    null,
    { _id: id },
    {
      _id: id,
      passwordReset: { ...currentReset(), expiresAt: new Date(Date.now() - 1) },
    },
    { _id: id, passwordReset: { ...currentReset(), attempts: 5 } },
  ]) {
    user = value;
    await assert.rejects(
      () => resetPassword(resetInput()),
      /Invalid or expired/,
    );
  }
  for (const input of [
    { ...resetInput(), password: "short" },
    { ...resetInput(), confirmPassword: "wrong" },
    resetInput("123"),
  ]) {
    await assert.rejects(
      () => resetPassword(input),
      (error) => error.statusCode === 400,
    );
  }
});

test("valid reset hashes the password and consumes code plus revokes sessions in one update; racing or repeated submissions lose", async (t) => {
  const emails = environment(t);
  const reset = currentReset();
  let consumed = false;
  t.mock.method(User, "findOne", () =>
    query({ _id: id, passwordReset: reset }),
  );
  t.mock.method(bcrypt, "hash", async (value, rounds) => {
    assert.equal(value, password);
    assert.equal(rounds, 12);
    return "new-bcrypt-hash";
  });
  t.mock.method(User, "findOneAndUpdate", (filter, update, options) => {
    assert.equal(filter["passwordReset.id"], resetId);
    assert.equal(filter["passwordReset.codeHash"], reset.codeHash);
    assert.equal(filter["passwordReset.attempts"].$lt, 5);
    assert.ok(filter["passwordReset.expiresAt"].$gt instanceof Date);
    assert.deepEqual(update, {
      $set: { password: "new-bcrypt-hash" },
      $unset: { passwordReset: "" },
      $inc: { tokenVersion: 1 },
    });
    assert.equal(options.runValidators, true);
    const value = consumed ? null : { email };
    consumed = true;
    return query(value);
  });
  const results = await Promise.allSettled([
    resetPassword(resetInput()),
    resetPassword(resetInput()),
  ]);
  assert.equal(
    results.filter((result) => result.status === "fulfilled").length,
    1,
  );
  assert.match(
    results.find((result) => result.status === "rejected").reason.message,
    /Invalid or expired/,
  );
  await assert.rejects(() => resetPassword(resetInput()), /Invalid or expired/);
  await tick();
  assert.equal(emails.length, 1);
  assert.equal(emails[0].payload.subject, "Your Outrise password was changed");
  assert.ok(!JSON.stringify(emails).includes(password));
  assert.ok(!JSON.stringify(emails).includes("042817"));
});

test("JWT versions reject old tokens after reset, accept new/legacy tokens appropriately, and expose the expiry code", async (t) => {
  environment(t);
  let account = {
    _id: id,
    role: "user",
    emailVerified: true,
    accountStatus: "active",
    tokenVersion: 1,
  };
  t.mock.method(User, "findById", () =>
    query(account, (fields) => assert.ok(fields.includes("+tokenVersion"))),
  );
  const request = (version) => ({
    headers: {
      authorization: `Bearer ${jwt.sign({ userId: id.toString(), ...(version === undefined ? {} : { tokenVersion: version }) }, process.env.JWT_SECRET)}`,
    },
  });
  for (const version of [undefined, 0]) {
    let error;
    await authenticate(request(version), {}, (result) => {
      error = result;
    });
    assert.equal(error.code, "SESSION_EXPIRED");
    const res = response();
    errorHandler(error, {}, res, () => {});
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.code, "SESSION_EXPIRED");
  }
  let error;
  const req = request(1);
  await authenticate(req, {}, (result) => {
    error = result;
  });
  assert.equal(error, undefined);
  assert.equal(req.user.userId, id.toString());
  account = {
    _id: id,
    role: "user",
    emailVerified: true,
    accountStatus: "active",
  };
  await authenticate(request(undefined), {}, (result) => {
    error = result;
  });
  assert.equal(error, undefined);
  account = { ...account, accountStatus: "banned", tokenVersion: 1 };
  await authenticate(request(1), {}, (result) => {
    error = result;
  });
  assert.equal(error.code, "ACCOUNT_BANNED");
});

test("login carries the current token version, including after an expired suspension is restored", async (t) => {
  environment(t);
  const user = {
    _id: id,
    email,
    username: "tester",
    role: "user",
    faction: null,
    password: "hash",
    tokenVersion: 3,
    accountStatus: "suspended",
    suspendedUntil: new Date(Date.now() - 1),
  };
  t.mock.method(User, "findOne", () =>
    query(user, (fields) => assert.ok(fields.includes("+tokenVersion"))),
  );
  t.mock.method(bcrypt, "compare", async () => true);
  t.mock.method(User, "findOneAndUpdate", async () => ({
    ...user,
    tokenVersion: undefined,
    accountStatus: "active",
  }));
  assert.equal((await loginUser({ email, password })).tokenVersion, 3);
  const res = response();
  await login({ body: { email, password } }, res, (error) =>
    assert.fail(error),
  );
  assert.equal(
    jwt.verify(res.body.token, process.env.JWT_SECRET).tokenVersion,
    3,
  );
  assert.equal(res.body.user.tokenVersion, undefined);
});

test("request/attempt IP limits are separate, expire and include a Retry-After header", () => {
  let now = 10000;
  const requestLimit = createPasswordResetLimiter({
    max: 2,
    windowMs: 60000,
    now: () => now,
  });
  const attemptLimit = createPasswordResetLimiter({
    max: 3,
    windowMs: 60000,
    now: () => now,
  });
  let accepted = 0;
  const req = { ip: "127.0.0.1" };
  const res = response();
  for (let i = 0; i < 3; i++) requestLimit(req, res, () => accepted++);
  assert.equal(accepted, 2);
  assert.equal(res.statusCode, 429);
  assert.equal(res.headers["Retry-After"], "60");
  attemptLimit(req, response(), () => accepted++);
  assert.equal(accepted, 3);
  now += 60000;
  requestLimit(req, response(), () => accepted++);
  assert.equal(accepted, 4);
});

test("auth emails preserve leading-zero codes and override aliases; provider failures do not expose payloads", async (t) => {
  const emails = environment(t);
  process.env.RESEND_PASSWORD_RESET_TEMPLATE = "custom-password-reset";
  await sendPasswordResetEmail({
    to: email,
    recipientName: "<Tester>",
    code: "000123",
    expiresInMinutes: 10,
    resetId,
  });
  assert.equal(emails[0].payload.template.id, "custom-password-reset");
  assert.equal(emails[0].payload.template.variables.RESET_CODE, "000123");
  assert.equal(emails[0].payload.template.variables.EXPIRES_IN_MINUTES, "10");
  t.mock.method(globalThis, "fetch", async () => ({
    ok: false,
    json: async () => ({ message: "private provider output" }),
  }));
  await assert.rejects(
    () => sendPasswordChangedEmail({ to: email, resetId }),
    (error) => error.statusCode === 502 && !error.message.includes("private"),
  );
});

test("controllers return generic request and successful reset responses without codes, passwords or tokens", async (t) => {
  environment(t);
  let reset;
  let completing = false;
  t.mock.method(User, "findOneAndUpdate", (filter, update) => {
    if (!completing) {
      reset = update.$set.passwordReset;
      return query(null);
    }
    return query({ email });
  });
  const reqRes = response();
  await forgotPassword({ body: { email } }, reqRes, (error) =>
    assert.fail(error),
  );
  assert.equal(reqRes.statusCode, 200);
  assert.equal(reqRes.body.code, undefined);
  reset.codeHash = codeHash("042817", reset.id);
  t.mock.method(User, "findOne", () =>
    query({ _id: id, passwordReset: reset }),
  );
  t.mock.method(bcrypt, "hash", async () => "hash");
  completing = true;
  const res = response();
  await resetPasswordController({ body: resetInput() }, res, (error) =>
    assert.fail(error),
  );
  assert.equal(res.statusCode, 200);
  assert.deepEqual(Object.keys(res.body), ["message"]);
  await tick();
});

// Execute Mongoose's actual query casting/validation and real bcrypt, replacing
// only the collection I/O. No real database or email provider is contacted.
test("full reset works through Mongoose queries and real bcrypt, and only the new password/token can sign in", async (t) => {
  const emails = environment(t);
  let stored = {
    _id: id,
    username: "tester",
    email,
    role: "user",
    faction: null,
    emailVerified: true,
    accountStatus: "active",
    password: await bcrypt.hash("old password 123", 12),
  };
  t.mock.method(User.collection, "findOne", async () =>
    structuredClone(stored),
  );
  t.mock.method(
    User.collection,
    "findOneAndUpdate",
    async (filter, update, options) => {
      assert.equal(options.returnDocument, "after");
      if (update.$set?.passwordReset) {
        assert.match(update.$set.passwordReset.codeHash, /^[a-f0-9]{64}$/);
        assert.ok(update.$set.passwordReset.expiresAt instanceof Date);
        assert.equal(options.projection.email, 1);
      } else {
        assert.equal(filter["passwordReset.id"], stored.passwordReset.id);
        assert.equal(
          filter["passwordReset.codeHash"],
          stored.passwordReset.codeHash,
        );
        assert.ok(filter["passwordReset.expiresAt"].$gt instanceof Date);
        assert.equal(filter["passwordReset.attempts"].$lt, 5);
      }
      stored = { ...stored, ...update.$set };
      if (update.$unset?.passwordReset !== undefined)
        delete stored.passwordReset;
      if (update.$inc?.tokenVersion)
        stored.tokenVersion =
          (stored.tokenVersion ?? 0) + update.$inc.tokenVersion;
      return structuredClone(stored);
    },
  );
  // structuredClone does not preserve BSON ObjectId's prototype. The collection
  // boundary returns a BSON id while cloning nested state to avoid mutations.
  const findOne = User.collection.findOne;
  const findUpdate = User.collection.findOneAndUpdate;
  t.mock.method(User.collection, "findOne", async (...args) => ({
    ...(await findOne(...args)),
    _id: id,
  }));
  t.mock.method(User.collection, "findOneAndUpdate", async (...args) => ({
    ...(await findUpdate(...args)),
    _id: id,
  }));
  await requestPasswordReset({ email });
  const code = emails[0].payload.template.variables.RESET_CODE;
  assert.ok(!JSON.stringify(stored).includes(`"${code}"`));
  await resetPassword(resetInput(code));
  assert.equal(stored.passwordReset, undefined);
  assert.equal(stored.tokenVersion, 1);
  assert.equal(await bcrypt.compare(password, stored.password), true);
  assert.equal(
    await bcrypt.compare("old password 123", stored.password),
    false,
  );
  await assert.rejects(
    () => loginUser({ email, password: "old password 123" }),
    /Invalid email or password/,
  );
  await assert.rejects(
    () => resetPassword(resetInput(code)),
    /Invalid or expired/,
  );
  const res = response();
  await login({ body: { email, password } }, res, (error) =>
    assert.fail(error),
  );
  const newToken = jwt.verify(res.body.token, process.env.JWT_SECRET);
  assert.equal(newToken.tokenVersion, 1);
  let error;
  await authenticate(
    { headers: { authorization: `Bearer ${res.body.token}` } },
    {},
    (result) => {
      error = result;
    },
  );
  assert.equal(error, undefined);
  const oldToken = jwt.sign(
    { userId: id.toString(), role: "user" },
    process.env.JWT_SECRET,
  );
  await authenticate(
    { headers: { authorization: `Bearer ${oldToken}` } },
    {},
    (result) => {
      error = result;
    },
  );
  assert.equal(error.code, "SESSION_EXPIRED");
  await tick();
});

test("email failures log useful fixed diagnostics while keeping provider messages, recipient and code private", async (t) => {
  environment(t);
  const cases = [
    {
      status: 404,
      name: "not_found",
      message: "Template password-reset not found",
      reason: "TEMPLATE_NOT_FOUND",
    },
    {
      status: 400,
      name: "validation_error",
      message: "Template must be published",
      reason: "TEMPLATE_NOT_PUBLISHED",
    },
    {
      status: 422,
      name: "validation_error",
      message: "Variable EXPIRES_IN_MINUTES must be a string",
      reason: "TEMPLATE_VARIABLES_INVALID",
    },
    {
      status: 401,
      name: "restricted_api_key",
      message: "Invalid key",
      reason: "API_KEY_OR_PERMISSION",
    },
    {
      status: 403,
      name: "validation_error",
      message: "Sender domain is not verified",
      reason: "SENDER_DOMAIN_OR_PERMISSION",
    },
    {
      status: 429,
      name: "daily_quota_exceeded",
      message: "Quota reached",
      reason: "RATE_LIMIT_OR_QUOTA",
    },
    {
      status: 503,
      name: "service_unavailable",
      message: "Unavailable",
      reason: "RESEND_UNAVAILABLE",
    },
  ];
  t.mock.method(User, "findOneAndUpdate", () => query({ _id: id, email }));
  for (const item of cases) {
    t.mock.method(globalThis, "fetch", async () => ({
      ok: false,
      status: item.status,
      json: async () => ({
        name: item.name,
        message: `${item.message}; private@example.com 000123 secret-key`,
      }),
    }));
    await requestPasswordReset({ email });
    await tick();
    const [, metadata] = logger.warn.mock.calls.at(-1).arguments;
    assert.deepEqual(metadata, {
      reason: item.reason,
      httpStatus: item.status,
      providerCode: item.name,
    });
    const logged = JSON.stringify(logger.warn.mock.calls.at(-1).arguments);
    for (const secret of ["private@example.com", "000123", "secret-key"])
      assert.ok(!logged.includes(secret));
  }
  const timeout = new Error("secret network details");
  timeout.name = "TimeoutError";
  t.mock.method(globalThis, "fetch", async () => {
    throw timeout;
  });
  await assert.rejects(
    () =>
      sendPasswordResetEmail({
        to: email,
        recipientName: "Tester",
        code: "000123",
        expiresInMinutes: 10,
        resetId,
      }),
    (error) => error.deliveryFailure.reason === "NETWORK_TIMEOUT",
  );
  t.mock.method(globalThis, "fetch", async () => ({
    ok: false,
    status: 400,
    json: async () => ({
      name: "secret-key",
      message: "private@example.com 000123",
    }),
  }));
  await assert.rejects(
    () => sendPasswordChangedEmail({ to: email, resetId }),
    (error) =>
      error.deliveryFailure.providerCode === null &&
      !JSON.stringify(error).includes("secret-key"),
  );
});
