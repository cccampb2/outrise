import { TERMS_VERSION, PRIVACY_VERSION } from "../src/config/legal.js";
const legalAcceptance = {
  acceptedAt: new Date("2026-10-07T12:00:00Z"),
  termsVersion: TERMS_VERSION,
  privacyVersion: PRIVACY_VERSION,
};
import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../src/models/User.js";
import {
  register,
  login,
  verifyEmailController,
} from "../src/controllers/auth.controllers.js";
import {
  authenticate,
  authenticateUnverified,
} from "../src/middleware/auth.js";
import logger from "../src/utils/logger.js";

const userId = new mongoose.Types.ObjectId();
const password = "signup password 123";
const passwordHash = "test-hash-never-expose";
const query = (value) => ({
  select() {
    return this;
  },
  then(resolve, reject) {
    return Promise.resolve(value).then(resolve, reject);
  },
});
const response = () => ({
  statusCode: undefined,
  body: undefined,
  status(value) {
    this.statusCode = value;
    return this;
  },
  json(value) {
    this.body = value;
    return this;
  },
});

function setup(t, { expiresIn, tokenVersion = 0, deliveryFails = false } = {}) {
  const keys = [
    "JWT_SECRET",
    "JWT_EXPIRES_IN",
    "RESEND_API_KEY",
    "RESEND_EMAIL_VERIFICATION_TEMPLATE",
    "EMAIL_FROM",
  ];
  const before = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  process.env.JWT_SECRET = "signup-session-tests-only";
  process.env.RESEND_API_KEY = "test-key-never-sent";
  if (expiresIn) process.env.JWT_EXPIRES_IN = expiresIn;
  else delete process.env.JWT_EXPIRES_IN;
  delete process.env.RESEND_EMAIL_VERIFICATION_TEMPLATE;
  delete process.env.EMAIL_FROM;
  t.after(() =>
    keys.forEach((key) => {
      if (before[key] === undefined) delete process.env[key];
      else process.env[key] = before[key];
    }),
  );

  const user = {
    _id: userId,
    username: "NewMember",
    email: "new-member@example.com",
    password: passwordHash,
    role: "user",
    accountStatus: "active",
    ageEligibilityConfirmedAt: new Date("2026-10-05T12:00:00Z"),
    legalAcceptance,
    emailVerified: false,
    faction: null,
    tokenVersion,
  };
  let created = false;
  const verificationWrites = [];
  const deliveries = [];
  const warnings = [];
  t.mock.method(User, "findOne", (filter) => {
    if (filter._id) {
      assert.equal(filter._id.toString(), userId.toString());
      return query(user);
    }
    return query(created && filter.email === user.email ? user : null);
  });
  t.mock.method(User, "create", async (input) => {
    assert.ok(input.ageEligibilityConfirmedAt instanceof Date);
    assert.equal(input.age, undefined);
    user.ageEligibilityConfirmedAt = input.ageEligibilityConfirmedAt;
    user.legalAcceptance = input.legalAcceptance;
    assert.deepEqual(input, {
      username: user.username,
      email: user.email,
      password: passwordHash,
      ageEligibilityConfirmedAt: user.ageEligibilityConfirmedAt,
      legalAcceptance: user.legalAcceptance,
    });
    created = true;
    return user;
  });
  t.mock.method(User, "findById", (id) => {
    assert.equal(id.toString(), userId.toString());
    return query(user);
  });
  t.mock.method(User, "findOneAndUpdate", (filter, update) => {
    assert.equal(filter._id.toString(), userId.toString());
    if (update.$set?.emailVerification) {
      verificationWrites.push(update);
    } else {
      assert.equal(update.$set?.emailVerified, true);
      assert.equal(filter["emailVerification.id"], user.emailVerification.id);
      assert.equal(
        filter["emailVerification.codeHash"],
        user.emailVerification.codeHash,
      );
    }
    Object.assign(user, update.$set);
    for (const key of Object.keys(update.$unset || {})) delete user[key];
    return query(user);
  });
  t.mock.method(bcrypt, "hash", async (input, rounds) => {
    assert.equal(input, password);
    assert.equal(rounds, 12);
    return passwordHash;
  });
  t.mock.method(bcrypt, "compare", async (input, hash) => {
    assert.equal(input, password);
    assert.equal(hash, passwordHash);
    return true;
  });
  t.mock.method(logger, "warn", (...args) => warnings.push(args));
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, "https://api.resend.com/emails");
    deliveries.push(JSON.parse(options.body));
    if (deliveryFails) {
      const error = new Error(
        "private-provider@example.com 000123 private-api-key",
      );
      error.name = "TimeoutError";
      throw error;
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({ id: "mock-signup-verification-email" }),
    };
  });
  return { user, deliveries, verificationWrites, warnings };
}

async function signup(fixture) {
  const res = response();
  await register(
    {
      body: {
        username: fixture.user.username,
        email: fixture.user.email,
        password,
        age: 18,
        accepted: true,
        termsVersion: TERMS_VERSION,
        privacyVersion: PRIVACY_VERSION,
      },
    },
    res,
    (error) => {
      throw error;
    },
  );
  assert.equal(res.statusCode, 201);
  return res.body;
}

async function authenticateToken(middleware, token) {
  const req = { headers: { authorization: `Bearer ${token}` } };
  let calls = 0;
  let error;
  await middleware(req, {}, (result) => {
    calls++;
    error = result;
  });
  assert.equal(calls, 1);
  return { req, error };
}

function assertSession(payload, fixture, expirySeconds) {
  assert.equal(typeof payload.token, "string");
  const claims = jwt.verify(payload.token, process.env.JWT_SECRET);
  assert.equal(claims.userId, fixture.user._id.toString());
  assert.equal(claims.role, fixture.user.role);
  assert.equal(claims.tokenVersion, fixture.user.tokenVersion);
  assert.equal(claims.exp - claims.iat, expirySeconds);
  assert.deepEqual(Object.keys(claims).sort(), [
    "exp",
    "iat",
    "role",
    "tokenVersion",
    "userId",
  ]);
  assert.deepEqual(Object.keys(payload).sort(), ["token", "user"]);
  assert.deepEqual(payload.user, {
    id: fixture.user._id,
    username: fixture.user.username,
    email: fixture.user.email,
    emailVerified: fixture.user.emailVerified,
    ageEligibilityConfirmedAt: fixture.user.ageEligibilityConfirmedAt,
    ageEligibilityRejectedAt: null,
    legalAcceptance: fixture.user.legalAcceptance,
    legalAcceptanceRequired: false,
    role: fixture.user.role,
    faction: fixture.user.faction,
  });
  const serialized = JSON.stringify(payload);
  for (const hidden of [
    password,
    passwordHash,
    "codeHash",
    "emailVerificationRequestedAt",
    "VERIFICATION_CODE",
  ]) {
    assert.ok(!serialized.includes(hidden));
  }
  assert.equal(payload.user.emailVerification, undefined);
  assert.equal(payload.user.tokenVersion, undefined);
  return claims;
}

test("signup returns a default seven-day JWT for immediate verification and sends exactly one initial email", async (t) => {
  const fixture = setup(t);
  const payload = await signup(fixture);
  assertSession(payload, fixture, 7 * 24 * 60 * 60);
  assert.equal(payload.user.emailVerified, false);
  assert.equal(User.create.mock.callCount(), 1);
  assert.equal(fixture.verificationWrites.length, 1);
  assert.equal(fixture.deliveries.length, 1);
  assert.deepEqual(fixture.deliveries[0].to, [fixture.user.email]);
  assert.equal(fixture.deliveries[0].template.id, "email-verification");
  const code = fixture.deliveries[0].template.variables.VERIFICATION_CODE;
  assert.match(code, /^\d{6}$/);
  assert.ok(!JSON.stringify(payload).includes(`"${code}"`));

  const identity = await authenticateToken(
    authenticateUnverified,
    payload.token,
  );
  assert.equal(identity.error, undefined);
  assert.equal(identity.req.user.userId, userId.toString());
  assert.equal(identity.req.user.emailVerified, false);
  const gated = await authenticateToken(authenticate, payload.token);
  assert.equal(gated.error.statusCode, 403);
  assert.equal(gated.error.code, "EMAIL_VERIFICATION_REQUIRED");

  const verified = response();
  await verifyEmailController(
    { user: identity.req.user, body: { code } },
    verified,
    (error) => {
      throw error;
    },
  );
  assert.equal(verified.statusCode, 200);
  assert.equal(verified.body.emailVerified, true);
  assert.equal(fixture.user.emailVerification, undefined);
  assert.equal(
    (await authenticateToken(authenticate, payload.token)).error,
    undefined,
  );
  assert.equal(fixture.deliveries.length, 1);
});

test("signup and login share configured token lifetime and the current token version", async (t) => {
  const fixture = setup(t, { expiresIn: "45m", tokenVersion: 4 });
  const signupPayload = await signup(fixture);
  const signupClaims = assertSession(signupPayload, fixture, 45 * 60);
  const res = response();
  await login(
    { body: { email: fixture.user.email, password } },
    res,
    (error) => {
      throw error;
    },
  );
  assert.equal(res.statusCode, 200);
  const loginClaims = jwt.verify(res.body.token, process.env.JWT_SECRET);
  for (const field of ["userId", "role", "tokenVersion"])
    assert.equal(loginClaims[field], signupClaims[field]);
  assert.equal(
    loginClaims.exp - loginClaims.iat,
    signupClaims.exp - signupClaims.iat,
  );
  assert.equal(res.body.user.tokenVersion, undefined);
  assert.equal(res.body.user.password, undefined);
  assert.equal(
    (await authenticateToken(authenticateUnverified, signupPayload.token))
      .error,
    undefined,
  );
  assert.equal(fixture.deliveries.length, 1);
});

test("an ambiguous initial-email failure still creates one account and returns a private, usable verification session", async (t) => {
  const fixture = setup(t, { deliveryFails: true });
  const payload = await signup(fixture);
  assertSession(payload, fixture, 7 * 24 * 60 * 60);
  assert.equal(User.create.mock.callCount(), 1);
  assert.equal(fixture.verificationWrites.length, 1);
  assert.equal(fixture.deliveries.length, 1);
  assert.equal(fixture.warnings.length, 1);
  assert.equal(fixture.warnings[0][1].reason, "NETWORK_TIMEOUT");
  assert.ok(fixture.user.emailVerification.expiresAt > new Date());
  assert.equal(
    (await authenticateToken(authenticateUnverified, payload.token)).error,
    undefined,
  );
  assert.equal(
    (await authenticateToken(authenticate, payload.token)).error.code,
    "EMAIL_VERIFICATION_REQUIRED",
  );
  for (const secret of [
    "private-provider@example.com",
    "000123",
    "private-api-key",
    passwordHash,
  ]) {
    assert.ok(
      !JSON.stringify({ payload, warnings: fixture.warnings }).includes(secret),
    );
  }
});
