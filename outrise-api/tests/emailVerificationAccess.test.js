import RegistrationRequest from "../src/models/RegistrationRequest.js";
import { TERMS_VERSION, PRIVACY_VERSION } from "../src/config/legal.js";
const legalAcceptance = {
  acceptedAt: new Date("2026-10-07T12:00:00Z"),
  termsVersion: TERMS_VERSION,
  privacyVersion: PRIVACY_VERSION,
};
import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import User from "../src/models/User.js";
import { register } from "../src/controllers/auth.controllers.js";
import {
  authenticate,
  authenticateUnverified,
} from "../src/middleware/auth.js";
import { errorHandler } from "../src/middleware/errorHandler.js";
import userRoutes from "../src/routes/user.routes.js";
import factionRoutes from "../src/routes/faction.routes.js";
import issueReportRoutes from "../src/routes/issueReport.routes.js";
import authRoutes from "../src/routes/auth.routes.js";
import * as authValidators from "../src/middleware/validators/auth.validators.js";

const userId = new mongoose.Types.ObjectId();
const query = (value, onSelect = () => {}) => ({
  select(fields) {
    onSelect(fields);
    return this;
  },
  then(resolve, reject) {
    return Promise.resolve(value).then(resolve, reject);
  },
});

function withSecret(t) {
  const previous = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "email-verification-access-test-secret";
  t.after(() => {
    if (previous === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previous;
  });
}

function request(claims = {}) {
  const token = jwt.sign(
    { userId: userId.toString(), role: "user", ...claims },
    process.env.JWT_SECRET,
  );
  return { headers: { authorization: `Bearer ${token}` } };
}

async function invoke(middleware, req = request()) {
  let calls = 0;
  let error;
  await middleware(req, {}, (result) => {
    calls++;
    error = result;
  });
  assert.equal(calls, 1);
  return { req, error };
}

const routeLayers = (router) => router.stack.filter((layer) => layer.route);
const route = (router, path, method) => {
  const found = routeLayers(router).find(
    (layer) => layer.route.path === path && layer.route.methods[method],
  );
  assert.ok(found, `${method.toUpperCase()} ${path} exists`);
  return found.route;
};
const hasMiddleware = (value, middleware) =>
  value.stack.some((layer) => layer.handle === middleware);

test("all accounts need database email verification, including legacy accounts with no field", async (t) => {
  withSecret(t);
  let account;
  t.mock.method(User, "findById", () =>
    query(account, (fields) => {
      assert.ok(fields.split(" ").includes("emailVerified"));
    }),
  );
  for (const emailVerified of [undefined, false]) {
    account = {
      _id: userId,
      role: "user",
      accountStatus: "active",
      ageEligibilityConfirmedAt: new Date("2026-10-05T12:00:00Z"),
      legalAcceptance,
      emailVerified,
    };
    const { error } = await invoke(authenticate);
    assert.equal(error.statusCode, 403);
    assert.equal(error.code, "EMAIL_VERIFICATION_REQUIRED");
  }
  account.emailVerified = true;
  const { req, error } = await invoke(authenticate);
  assert.equal(error, undefined);
  assert.equal(req.user.emailVerified, true);
});

test("stale or forged JWT verification claims never override the database", async (t) => {
  withSecret(t);
  let emailVerified = false;
  t.mock.method(User, "findById", () =>
    query({
      _id: userId,
      role: "user",
      accountStatus: "active",
      ageEligibilityConfirmedAt: new Date("2026-10-05T12:00:00Z"),
      legalAcceptance,
      emailVerified,
    }),
  );
  const oldRequest = request({ emailVerified: true });
  assert.equal(
    (await invoke(authenticate, oldRequest)).error.code,
    "EMAIL_VERIFICATION_REQUIRED",
  );
  emailVerified = true;
  const { req, error } = await invoke(
    authenticate,
    request({ emailVerified: false }),
  );
  assert.equal(error, undefined);
  assert.equal(req.user.emailVerified, true);
  emailVerified = false;
  assert.equal(
    (await invoke(authenticate, oldRequest)).error.code,
    "EMAIL_VERIFICATION_REQUIRED",
  );
});

test("the verification exception permits unverified identities while retaining session and moderation protection", async (t) => {
  withSecret(t);
  let account = {
    _id: userId,
    role: "user",
    accountStatus: "active",
    ageEligibilityConfirmedAt: new Date("2026-10-05T12:00:00Z"),
    legalAcceptance,
    emailVerified: false,
    tokenVersion: 1,
  };
  t.mock.method(User, "findById", () => query(account));
  const { req, error } = await invoke(
    authenticateUnverified,
    request({ tokenVersion: 1, emailVerified: true }),
  );
  assert.equal(error, undefined);
  assert.equal(req.user.emailVerified, false);
  assert.equal(
    (await invoke(authenticateUnverified, request({ tokenVersion: 0 }))).error
      .code,
    "SESSION_EXPIRED",
  );
  for (const accountStatus of ["suspended", "banned"]) {
    account = {
      ...account,
      accountStatus,
      suspendedUntil: new Date(Date.now() + 60000),
    };
    assert.equal(
      (await invoke(authenticateUnverified, request({ tokenVersion: 1 }))).error
        .code,
      accountStatus === "suspended" ? "ACCOUNT_SUSPENDED" : "ACCOUNT_BANNED",
    );
  }
  account = null;
  assert.equal((await invoke(authenticateUnverified)).error.statusCode, 401);
  assert.equal(
    (await invoke(authenticateUnverified, { headers: {} })).error.statusCode,
    401,
  );
});

test("restoring an expired suspension preserves the current database verification status", async (t) => {
  withSecret(t);
  const suspended = {
    _id: userId,
    role: "user",
    accountStatus: "suspended",
    suspendedUntil: new Date(Date.now() - 1000),
    emailVerified: false,
  };
  let restored = {
    ...suspended,
    accountStatus: "active",
    ageEligibilityConfirmedAt: new Date("2026-10-05T12:00:00Z"),
    legalAcceptance,
    suspendedUntil: null,
  };
  t.mock.method(User, "findById", () => query(suspended));
  t.mock.method(User, "findOneAndUpdate", async () => restored);
  assert.equal(
    (await invoke(authenticate)).error.code,
    "EMAIL_VERIFICATION_REQUIRED",
  );
  restored = { ...restored, emailVerified: true };
  const { req, error } = await invoke(authenticate);
  assert.equal(error, undefined);
  assert.equal(req.user.emailVerified, true);
});

test("verification-required responses preserve the public error code for mobile routing", () => {
  const error = Object.assign(
    new Error("Verify your email before continuing."),
    { statusCode: 403, code: "EMAIL_VERIFICATION_REQUIRED" },
  );
  let body;
  errorHandler(
    error,
    { method: "GET", originalUrl: "/workouts" },
    {
      status(code) {
        assert.equal(code, 403);
        return this;
      },
      json(value) {
        body = value;
      },
    },
    () => assert.fail("The error should be handled"),
  );
  assert.equal(body.code, "EMAIL_VERIFICATION_REQUIRED");
  assert.equal(body.message, error.message);
});

test("only current-user reads bypass verification; profile writes and public profile reads stay protected", () => {
  const currentUser = route(userRoutes, "/me", "get");
  assert.ok(hasMiddleware(currentUser, authenticateUnverified));
  assert.ok(!hasMiddleware(currentUser, authenticate));
  for (const { route: value } of routeLayers(userRoutes)) {
    if (value === currentUser || (value.methods.delete && value.path === "/me"))
      continue;
    assert.ok(
      hasMiddleware(value, authenticate),
      `${Object.keys(value.methods)[0]} ${value.path} requires verification`,
    );
    assert.ok(!hasMiddleware(value, authenticateUnverified));
  }
});

test("onboarding cannot assess or confirm a faction before email verification; faction catalog stays public", () => {
  const catalog = route(factionRoutes, "/", "get");
  assert.ok(!hasMiddleware(catalog, authenticate));
  assert.ok(!hasMiddleware(catalog, authenticateUnverified));
  for (const [path, method] of [
    ["/assessment", "get"],
    ["/assessment", "post"],
    ["/confirm", "post"],
  ]) {
    const value = route(factionRoutes, path, method);
    assert.equal(
      value.stack[0].handle,
      authenticate,
      `${method} ${path} checks verification first`,
    );
    assert.ok(!hasMiddleware(value, authenticateUnverified));
  }
});

test("every protected data and administration router retains default verified authentication", async () => {
  for (const name of [
    "exercise",
    "workout",
    "workoutSession",
    "personalRecord",
    "leaderboard",
    "season",
    "workoutOfTheWeek",
    "verification",
    "friend",
    "activity",
    "notification",
    "adminAchievement",
    "adminUser",
    "adminIssueReport",
  ]) {
    const { default: router } = await import(`../src/routes/${name}.routes.js`);
    const commonAuthenticationIndex = router.stack.findIndex(
      (layer) => !layer.route && layer.handle === authenticate,
    );
    assert.ok(
      !router.stack.some((layer) => layer.handle === authenticateUnverified),
      `${name} has no router-wide verification exception`,
    );
    for (const [index, layer] of router.stack.entries()) {
      if (!layer.route) continue;
      const value = layer.route;
      assert.ok(
        (commonAuthenticationIndex >= 0 && commonAuthenticationIndex < index) ||
          hasMiddleware(value, authenticate),
        `${name}: ${Object.keys(value.methods)[0]} ${value.path} requires verification`,
      );
      assert.ok(
        !hasMiddleware(value, authenticateUnverified),
        `${name} ${value.path} has no verification exception`,
      );
    }
  }
});

test("verification requests and confirmations use authenticated identity without requiring verified status", () => {
  for (const path of [
    "/email-verification/request",
    "/email-verification/confirm",
  ]) {
    const value = route(authRoutes, path, "post");
    assert.ok(hasMiddleware(value, authenticateUnverified));
    assert.ok(!hasMiddleware(value, authenticate));
  }
  const support = route(issueReportRoutes, "/", "post");
  assert.ok(!hasMiddleware(support, authenticate));
  assert.ok(!hasMiddleware(support, authenticateUnverified));
});

test("verification validation rejects caller-supplied identities and malformed or non-string codes", () => {
  const requestSchema = authValidators.requestEmailVerificationSchema.body;
  const verifySchema = authValidators.verifyEmailSchema.body;
  assert.equal(requestSchema.validate({}).error, undefined);
  assert.equal(verifySchema.validate({ code: "042817" }).error, undefined);
  for (const identity of [
    { email: "other@example.com" },
    { userId: userId.toString() },
    { emailVerified: true },
  ]) {
    assert.ok(requestSchema.validate(identity).error);
    assert.ok(verifySchema.validate({ code: "042817", ...identity }).error);
  }
  for (const code of [
    undefined,
    "",
    "12345",
    "1234567",
    "12a456",
    42817,
    123456,
  ]) {
    assert.ok(
      verifySchema.validate({ code }).error,
      `${String(code)} is rejected`,
    );
  }
});

test("new accounts start unverified and verification secrets are excluded from normal queries", () => {
  assert.equal(User.schema.path("emailVerified").instance, "Boolean");
  assert.equal(
    new User({
      username: "tester",
      email: "tester@example.com",
      password: "hash",
    }).emailVerified,
    false,
  );
  for (const field of ["emailVerification", "emailVerificationRequestedAt"]) {
    assert.equal(
      User.schema.path(field).options.select,
      false,
      `${field} is hidden`,
    );
  }
});

test("registration starts privately without touching accounts or returning a session", async (t) => {
  withSecret(t);
  const previousKey = process.env.RESEND_API_KEY;
  process.env.RESEND_API_KEY = "test-key";
  t.after(() => {
    if (previousKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previousKey;
  });
  t.mock.method(User, "findOne", () => assert.fail("no account lookup"));
  t.mock.method(User, "create", () => assert.fail("no account creation"));
  t.mock.method(bcrypt, "hash", async () => "test-password-hash");
  t.mock.method(RegistrationRequest, "create", async (input) => {
    assert.equal(input.passwordHash, "test-password-hash");
    assert.equal(input.age, undefined);
    assert.equal(input.password, undefined);
    return input;
  });
  t.mock.method(globalThis, "fetch", () =>
    assert.fail("no email delivery in HTTP request"),
  );
  let payload;
  await register(
    {
      body: {
        username: "Tester",
        email: "tester@example.com",
        password: "password123",
        age: 18,
        accepted: true,
        termsVersion: TERMS_VERSION,
        privacyVersion: PRIVACY_VERSION,
      },
    },
    {
      status(code) {
        assert.equal(code, 202);
        return this;
      },
      json(value) {
        payload = value;
      },
    },
    (error) => {
      throw error;
    },
  );
  assert.match(payload.requestId, /^[a-f0-9]{48}$/);
  assert.equal(payload.token, undefined);
  assert.equal(payload.user, undefined);
  assert.ok(!JSON.stringify(payload).includes("codeHash"));
});
