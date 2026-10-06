import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import User from "../src/models/User.js";
import UserRoleChange from "../src/models/UserRoleChange.js";
import AccountModeration from "../src/models/AccountModeration.js";
import {
  setUserRole,
  getAdminUser,
} from "../src/services/adminUser.service.js";
import { adminUserRoleSchema } from "../src/middleware/validators/adminUser.validators.js";
import routes from "../src/routes/adminUser.routes.js";
import { authenticate } from "../src/middleware/auth.js";
import { requireRole } from "../src/middleware/requireRole.js";

const id = () => new mongoose.Types.ObjectId();
const ownerId = id(),
  userId = id();
const query = (value) => ({
  select() {
    return this;
  },
  session() {
    return this;
  },
  sort() {
    return this;
  },
  limit() {
    return this;
  },
  populate() {
    return this;
  },
  lean: async () => value,
  then(resolve, reject) {
    return Promise.resolve(value).then(resolve, reject);
  },
});

test("role changes require an owner on the route and reject owner assignments or injected actors", () => {
  assert.equal(routes.stack[0].handle, authenticate);
  const patch = routes.stack.find(
    (layer) => layer.route?.path === "/:userId/role",
  ).route;
  assert.ok(patch.methods.patch);
  for (const role of ["user", "moderator", "admin", "owner"]) {
    let error;
    patch.stack[0].handle({ user: { role } }, {}, (result) => {
      error = result;
    });
    assert.equal(error?.statusCode, role === "owner" ? undefined : 403);
  }
  const body = {
    role: "admin",
    expectedRole: "user",
    reason: "Trusted staff member",
  };
  assert.equal(adminUserRoleSchema.body.validate(body).error, undefined);
  for (const invalid of [
    { ...body, role: "owner" },
    { ...body, role: "moderator" },
    { ...body, expectedRole: undefined },
    { ...body, reason: "  " },
    { ...body, reason: "a".repeat(1001) },
    { ...body, ownerId: ownerId.toString() },
    { ...body, userId: ownerId.toString() },
  ])
    assert.ok(adminUserRoleSchema.body.validate(invalid).error);
});

test("promotion and demotion save a role history entry in the same transaction", async (t) => {
  let ended = 0;
  const session = {
    withTransaction: async (callback) => callback(),
    endSession: async () => {
      ended++;
    },
  };
  const user = {
    _id: userId,
    role: "user",
    emailVerified: true,
    accountStatus: "active",
    ageEligibilityConfirmedAt: new Date("2026-10-05T12:00:00Z"),
    lifetimeXP: 300,
    save: async (options) => {
      assert.equal(options.session, session);
    },
  };
  t.mock.method(mongoose, "startSession", async () => session);
  t.mock.method(User, "findById", (value) =>
    query(value.toString() === ownerId.toString() ? { role: "owner" } : user),
  );
  const history = [];
  t.mock.method(UserRoleChange, "create", async ([entry], options) => {
    assert.equal(options.session, session);
    await new UserRoleChange(entry).validate();
    history.push(entry);
  });
  await setUserRole({
    userId,
    ownerId,
    role: "admin",
    expectedRole: "user",
    reason: "  Trusted staff  ",
  });
  assert.equal(user.role, "admin");
  assert.deepEqual(history[0], {
    user: userId,
    owner: ownerId,
    previousRole: "user",
    role: "admin",
    reason: "Trusted staff",
  });
  await setUserRole({
    userId,
    ownerId,
    role: "user",
    expectedRole: "admin",
    reason: "No longer staff",
  });
  assert.equal(user.role, "user");
  assert.equal(user.lifetimeXP, 300);
  assert.equal(user.accountStatus, "active");
  assert.equal(history[1].previousRole, "admin");
  assert.equal(history[1].role, "user");
  assert.equal(ended, 2);
});

test("the service protects owners, checks the acting owner and rejects stale or duplicate changes", async (t) => {
  const session = {
    withTransaction: async (callback) => callback(),
    endSession: async () => {},
  };
  t.mock.method(mongoose, "startSession", async () => session);
  let actorRole = "admin";
  let user = {
    _id: userId,
    role: "user",
    emailVerified: true,
    accountStatus: "active",
    ageEligibilityConfirmedAt: new Date("2026-10-05T12:00:00Z"),
  };
  t.mock.method(User, "findById", (value) =>
    query(value.toString() === ownerId.toString() ? { role: actorRole } : user),
  );
  const request = {
    userId,
    ownerId,
    role: "admin",
    expectedRole: "user",
    reason: "Staff",
  };
  await assert.rejects(
    () => setUserRole(request),
    (error) => error.statusCode === 403,
  );
  actorRole = "owner";
  user.role = "owner";
  await assert.rejects(
    () => setUserRole(request),
    (error) => error.statusCode === 403,
  );
  user.role = "moderator";
  await assert.rejects(
    () => setUserRole(request),
    (error) => error.statusCode === 409,
  );
  user.role = "admin";
  await assert.rejects(
    () => setUserRole({ ...request, expectedRole: "admin" }),
    /already has/,
  );
  await assert.rejects(
    () => setUserRole({ ...request, userId: ownerId, expectedRole: "owner" }),
    (error) => error.statusCode === 403,
  );
  user = null;
  await assert.rejects(
    () => setUserRole(request),
    (error) => error.statusCode === 404,
  );
  await assert.rejects(
    () => setUserRole({ ...request, role: "owner" }),
    (error) => error.statusCode === 400,
  );
});

test("restricted or flagged accounts must be restored before promotion, and audit failures fail the transaction", async (t) => {
  const session = {
    withTransaction: async (callback) => callback(),
    endSession: async () => {},
  };
  t.mock.method(mongoose, "startSession", async () => session);
  const user = {
    _id: userId,
    role: "user",
    accountStatus: "banned",
    save: async () => {},
  };
  t.mock.method(User, "findById", (value) =>
    query(value.toString() === ownerId.toString() ? { role: "owner" } : user),
  );
  const request = {
    userId,
    ownerId,
    role: "admin",
    expectedRole: "user",
    reason: "Staff",
  };
  for (const accountStatus of ["flagged", "suspended", "banned"]) {
    user.accountStatus = accountStatus;
    await assert.rejects(() => setUserRole(request), /Restore this account/);
    assert.equal(user.role, "user");
  }
  user.accountStatus = "active";
  t.mock.method(UserRoleChange, "create", async () => {
    throw new Error("Audit unavailable");
  });
  await assert.rejects(() => setUserRole(request), /Audit unavailable/);
});

test("account details include bounded internal role history with the owner username", async (t) => {
  t.mock.method(User, "findById", () => query({ _id: userId, role: "admin" }));
  t.mock.method(AccountModeration, "find", () => query([]));
  const entry = {
    previousRole: "user",
    role: "admin",
    reason: "Trusted",
    owner: { username: "Owner" },
  };
  t.mock.method(UserRoleChange, "find", (filter) => {
    assert.equal(filter.user, userId);
    const result = query([entry]);
    result.limit = (value) => {
      assert.equal(value, 30);
      return result;
    };
    result.populate = (path, fields) => {
      assert.equal(path, "owner");
      assert.equal(fields, "username");
      return result;
    };
    return result;
  });
  assert.equal((await getAdminUser(userId)).roleHistory[0], entry);
});

test("a demoted admin loses permission on their next request despite an old admin token", async (t) => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "role-demotion-test";
  t.after(() => {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });
  t.mock.method(User, "findById", () =>
    query({
      _id: userId,
      role: "user",
      emailVerified: true,
      accountStatus: "active",
      ageEligibilityConfirmedAt: new Date("2026-10-05T12:00:00Z"),
    }),
  );
  const token = jwt.sign(
    { userId: userId.toString(), role: "admin" },
    process.env.JWT_SECRET,
  );
  const req = { headers: { authorization: `Bearer ${token}` } };
  await authenticate(req, {}, (error) => {
    assert.equal(error, undefined);
  });
  requireRole("admin")(req, {}, (error) => {
    assert.equal(error.statusCode, 403);
  });
});
