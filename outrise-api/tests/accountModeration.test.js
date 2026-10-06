import { beforeEach } from "node:test";
import UserBlock from "../src/models/UserBlock.js";
beforeEach((t) => {
  t.mock.method(UserBlock, "find", () => ({
    select() {
      return this;
    },
    session() {
      return this;
    },
    lean: async () => [],
  }));
});
import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import User from "../src/models/User.js";
import AccountModeration from "../src/models/AccountModeration.js";
import UserRoleChange from "../src/models/UserRoleChange.js";
import AccountRestrictedError from "../src/errors/AccountRestrictedError.js";
import {
  ensureAccountAccess,
  restoreExpiredSuspensions,
} from "../src/services/accountAccess.service.js";
import { loginUser } from "../src/services/auth.services.js";
import {
  setUserAccountStatus,
  listAdminUsers,
  getAdminUser,
} from "../src/services/adminUser.service.js";
import { authenticate } from "../src/middleware/auth.js";
import { requireRole } from "../src/middleware/requireRole.js";
import { errorHandler } from "../src/middleware/errorHandler.js";
import {
  adminUserStatusSchema,
  adminUserListSchema,
} from "../src/middleware/validators/adminUser.validators.js";
import { getUserGlobalRank } from "../src/services/leaderboard.service.js";
import { getNotificationVisibility } from "../src/services/notification.service.js";

const id = () => new mongoose.Types.ObjectId();
const userId = id(),
  adminId = id();
const query = (value) => ({
  select() {
    return this;
  },
  sort() {
    return this;
  },
  skip() {
    return this;
  },
  limit() {
    return this;
  },
  populate() {
    return this;
  },
  session() {
    return this;
  },
  lean: async () => value,
  then(resolve, reject) {
    return Promise.resolve(value).then(resolve, reject);
  },
});

test("active and flagged users can log in; restricted users must supply correct credentials before seeing a restriction", async (t) => {
  let user;
  let passwordMatches = true;
  t.mock.method(User, "findOne", () => query(user));
  t.mock.method(bcrypt, "compare", async () => passwordMatches);
  for (const accountStatus of ["active", "flagged", "suspended", "banned"]) {
    user = {
      _id: userId,
      password: "hash",
      accountStatus,
      moderationReason: "PRIVATE REASON",
      suspendedUntil: new Date(Date.now() + 60000),
    };
    if (["active", "flagged"].includes(accountStatus)) {
      assert.equal(
        await loginUser({ email: "tester@example.com", password: "password" }),
        user,
      );
    } else {
      await assert.rejects(
        () => loginUser({ email: "tester@example.com", password: "password" }),
        (error) => {
          assert.ok(error instanceof AccountRestrictedError);
          assert.equal(
            error.code,
            accountStatus === "suspended"
              ? "ACCOUNT_SUSPENDED"
              : "ACCOUNT_BANNED",
          );
          assert.ok(!error.message.includes("PRIVATE REASON"));
          return true;
        },
      );
    }
  }
  passwordMatches = false;
  await assert.rejects(
    () => loginUser({ email: "tester@example.com", password: "wrong" }),
    /Invalid email or password/,
  );
});

test("existing sessions use the database status and role, and cannot bypass a new suspension or ban", async (t) => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "moderation-tests-only-secret";
  t.after(() => {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });
  let user = {
    _id: userId,
    role: "user",
    emailVerified: true,
    ageEligibilityConfirmedAt: new Date("2026-10-05T12:00:00Z"),
    accountStatus: "flagged",
  };
  t.mock.method(User, "findById", () => query(user));
  const token = jwt.sign(
    { userId: userId.toString(), role: "admin" },
    process.env.JWT_SECRET,
  );
  const req = { headers: { authorization: `Bearer ${token}` } };
  let result;
  await authenticate(req, {}, (error) => {
    result = error;
  });
  assert.equal(result, undefined);
  assert.equal(req.user.role, "user");
  requireRole("admin")(req, {}, (error) => {
    result = error;
  });
  assert.equal(result.statusCode, 403);
  for (const accountStatus of ["suspended", "banned"]) {
    user = {
      ...user,
      accountStatus,
      suspendedUntil: new Date(Date.now() + 60000),
    };
    await authenticate(req, {}, (error) => {
      result = error;
    });
    assert.ok(result instanceof AccountRestrictedError);
  }
  user = null;
  await authenticate(req, {}, (error) => {
    result = error;
  });
  assert.equal(result.statusCode, 401);
});

test("expired suspensions restore access at the boundary without overwriting a concurrent ban", async (t) => {
  const suspended = {
    _id: userId,
    accountStatus: "suspended",
    suspendedUntil: new Date(Date.now() - 1),
  };
  const restored = {
    _id: userId,
    accountStatus: "active",
    ageEligibilityConfirmedAt: new Date("2026-10-05T12:00:00Z"),
    suspendedUntil: null,
  };
  let updateResult = restored;
  t.mock.method(User, "findOneAndUpdate", async (filter, update, options) => {
    assert.equal(filter.accountStatus, "suspended");
    assert.equal(filter._id, userId);
    assert.ok(filter.suspendedUntil.$lte >= suspended.suspendedUntil);
    assert.equal(update.$set.accountStatus, "active");
    assert.ok("moderationReason" in update.$unset);
    assert.equal(options.runValidators, true);
    return updateResult;
  });
  assert.equal(await ensureAccountAccess(suspended), restored);
  updateResult = null;
  t.mock.method(User, "findById", async () => ({
    _id: userId,
    accountStatus: "banned",
  }));
  await assert.rejects(
    () => ensureAccountAccess(suspended),
    (error) => error.code === "ACCOUNT_BANNED",
  );
  t.mock.method(User, "updateMany", async (filter, update) => {
    assert.equal(filter.accountStatus, "suspended");
    assert.equal(filter.suspendedUntil.$ne, null);
    assert.ok(filter.suspendedUntil.$lte instanceof Date);
    assert.equal(update.$set.suspendedUntil, null);
  });
  await restoreExpiredSuspensions();
});

test("restriction responses contain only the public message, status, code and lift date", () => {
  const suspendedUntil = new Date(Date.now() + 60000);
  for (const accountStatus of ["suspended", "banned"]) {
    const error = new AccountRestrictedError({
      accountStatus,
      suspendedUntil,
      moderationReason: "PRIVATE REASON",
      moderatedBy: adminId,
    });
    let body;
    const res = {
      status(code) {
        assert.equal(code, 403);
        return this;
      },
      json(value) {
        body = value;
      },
    };
    errorHandler(error, {}, res, () =>
      assert.fail("Restriction must be handled"),
    );
    assert.equal(body.accountStatus, accountStatus);
    assert.equal(
      body.suspendedUntil,
      accountStatus === "suspended" ? suspendedUntil : null,
    );
    assert.ok(!JSON.stringify(body).includes("PRIVATE REASON"));
    assert.ok(!("moderationReason" in body));
    assert.ok(!("moderatedBy" in body));
  }
  assert.equal(User.schema.path("moderationReason").options.select, false);
});

test("moderation writes a seven-day suspension and private audit in one transaction, and can restore or ban", async (t) => {
  const session = {
    withTransaction: async (callback) => callback(),
    endSession: async () => {},
  };
  t.mock.method(mongoose, "startSession", async () => session);
  const user = {
    _id: userId,
    role: "user",
    emailVerified: true,
    accountStatus: "flagged",
    save: async (options) => assert.equal(options.session, session),
  };
  t.mock.method(User, "findById", () => query(user));
  const actions = [];
  t.mock.method(AccountModeration, "create", async ([action], options) => {
    assert.equal(options.session, session);
    actions.push(action);
  });
  const before = Date.now();
  await setUserAccountStatus({
    userId,
    adminId,
    status: "suspended",
    reason: "  PRIVATE REASON  ",
  });
  assert.equal(user.accountStatus, "suspended");
  assert.ok(user.suspendedUntil.getTime() >= before + 7 * 86400000);
  assert.ok(user.suspendedUntil.getTime() <= Date.now() + 7 * 86400000);
  assert.equal(user.moderationReason, "PRIVATE REASON");
  assert.equal(actions[0].previousStatus, "flagged");
  await new AccountModeration(actions[0]).validate();
  await setUserAccountStatus({
    userId,
    adminId,
    status: "banned",
    reason: "Fraud",
  });
  assert.equal(user.suspendedUntil, null);
  await setUserAccountStatus({
    userId,
    adminId,
    status: "active",
    reason: "Incorrect account was selected",
  });
  assert.equal(user.moderationReason, undefined);
  assert.equal(actions.length, 3);
  assert.equal(actions[2].reason, "Incorrect account was selected");
  t.mock.method(AccountModeration, "create", async () => {
    throw new Error("Audit failed");
  });
  await assert.rejects(
    () =>
      setUserAccountStatus({
        userId,
        adminId,
        status: "flagged",
        reason: "Warning",
      }),
    /Audit failed/,
  );
});

test("admin moderation cannot restrict administrator accounts and validates reasons, durations and request fields", async (t) => {
  const session = {
    withTransaction: async (callback) => callback(),
    endSession: async () => {},
  };
  t.mock.method(mongoose, "startSession", async () => session);
  t.mock.method(User, "findById", () =>
    query({ _id: adminId, role: "admin", accountStatus: "active" }),
  );
  await assert.rejects(
    () =>
      setUserAccountStatus({
        userId: adminId,
        adminId,
        status: "banned",
        reason: "Test",
      }),
    /Administrator/,
  );
  const schema = adminUserStatusSchema.body;
  assert.equal(
    schema.validate({ status: "suspended", reason: "Test" }).value
      .suspensionDays,
    7,
  );
  for (const data of [
    { status: "banned", reason: "" },
    { status: "suspended", reason: "Test", suspensionDays: 0 },
    { status: "suspended", reason: "Test", suspensionDays: 1.5 },
    { status: "suspended", reason: "Test", suspensionDays: 366 },
    { status: "flagged", reason: "Test", suspensionDays: 7 },
    { status: "active", reason: "Test", adminId: userId.toString() },
  ])
    assert.ok(schema.validate(data).error);
  assert.ok(!adminUserListSchema.query.validate({ status: "flagged" }).error);
  await assert.rejects(
    () =>
      setUserAccountStatus({
        userId,
        adminId,
        status: "suspended",
        reason: "Test",
        suspensionDays: -1,
      }),
    /Suspension length/,
  );
});

test("admin search escapes literal input, filters status, selects private metadata, and returns recent history", async (t) => {
  let captured;
  let selection;
  const adminUser = {
    _id: userId,
    accountStatus: "flagged",
    moderationReason: "Private",
  };
  t.mock.method(User, "find", (filter) => {
    captured = filter;
    const result = query([adminUser]);
    result.select = (fields) => {
      selection = fields;
      return result;
    };
    return result;
  });
  t.mock.method(User, "countDocuments", async () => 1);
  const result = await listAdminUsers({ search: "a.b", status: "flagged" });
  assert.equal(result.users[0], adminUser);
  assert.equal(captured.accountStatus, "flagged");
  assert.equal(captured.$or[0].username.$regex, "a\\.b");
  assert.ok(selection.includes("+moderationReason"));
  assert.ok(!selection.includes("password"));
  t.mock.method(User, "findById", () => query(adminUser));
  t.mock.method(AccountModeration, "find", (filter) => {
    assert.equal(filter.user, userId);
    return query([{ reason: "Private" }]);
  });
  t.mock.method(UserRoleChange, "find", () => query([]));
  assert.equal((await getAdminUser(userId)).history[0].reason, "Private");
});

test("flagged users retain progression rankings and personal, global and faction notifications", async (t) => {
  const faction = id();
  t.mock.method(User, "findById", () =>
    query({
      _id: userId,
      accountStatus: "flagged",
      lifetimeXP: 100,
      faction,
      createdAt: new Date(),
    }),
  );
  t.mock.method(User, "countDocuments", async (filter) => {
    assert.deepEqual(filter.accountStatus.$in, ["active", "flagged"]);
    return 2;
  });
  assert.equal((await getUserGlobalRank(userId)).globalRank, 3);
  const visibility = await getNotificationVisibility(userId);
  assert.ok(visibility.$or.some((audience) => audience.audience === "faction"));
  assert.ok(
    visibility.$or.some((audience) => audience.audience === "personal"),
  );
  assert.ok(visibility.$or.some((audience) => audience.audience === "global"));
});
