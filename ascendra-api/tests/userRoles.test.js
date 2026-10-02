import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import User from "../src/models/User.js";
import Friendship from "../src/models/Friendship.js";
import { requireRole } from "../src/middleware/requireRole.js";
import { authenticate } from "../src/middleware/auth.js";
import { getPublicUser } from "../src/controllers/user.controller.js";
import { getGlobalLeaderboard, getCurrentUserLeaderboardPosition } from "../src/services/leaderboard.service.js";
import { getFriends } from "../src/services/friend.service.js";
import { setUserAccountStatus } from "../src/services/adminUser.service.js";

const id = () => new mongoose.Types.ObjectId();
const query = (value, onSelect = () => {}) => ({
  select(fields) { onSelect(fields); return this; },
  sort() { return this; }, skip() { return this; }, limit() { return this; },
  populate() { return this; }, session() { return this; },
  lean: async () => value,
  then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); },
});

test("owner is allowed by the user schema while unknown roles fail validation", async () => {
  const user = new User({ username: "owner", email: "owner@example.com", password: "hash", role: "owner" });
  await user.validate();
  user.role = "superuser";
  await assert.rejects(() => user.validate(), /role/);
  assert.equal(new User().role, "user");
});

test("owners inherit admin access without letting admins into owner-only endpoints", () => {
  for (const role of ["user", "moderator", "admin", "owner"]) {
    let error;
    requireRole("admin")({ user: { role } }, {}, (result) => { error = result; });
    assert.equal(error?.statusCode, ["admin", "owner"].includes(role) ? undefined : 403);
    requireRole("owner")({ user: { role } }, {}, (result) => { error = result; });
    assert.equal(error?.statusCode, role === "owner" ? undefined : 403);
  }
});

test("a database promotion to owner is recognized even with an older token", async (t) => {
  const secret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "owner-tests-only";
  t.after(() => { if (secret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = secret; });
  const user = { _id: id(), role: "owner", accountStatus: "active" };
  t.mock.method(User, "findById", () => query(user));
  const token = jwt.sign({ userId: user._id.toString(), role: "user" }, process.env.JWT_SECRET);
  const req = { headers: { authorization: `Bearer ${token}` } };
  let error;
  await authenticate(req, {}, (result) => { error = result; });
  assert.equal(error, undefined);
  assert.equal(req.user.role, "owner");
});

test("another administrator cannot flag, suspend or ban an owner", async (t) => {
  const session = { withTransaction: async (callback) => callback(), endSession: async () => {} };
  t.mock.method(mongoose, "startSession", async () => session);
  const owner = { _id: id(), role: "owner", accountStatus: "active" };
  t.mock.method(User, "findById", () => query(owner));
  for (const status of ["flagged", "suspended", "banned"]) {
    await assert.rejects(() => setUserAccountStatus({ userId: owner._id, adminId: id(), status, reason: "Test" }), (error) => error.statusCode === 403);
  }
});

test("public profiles expose the role without exposing private account details", async (t) => {
  const user = { _id: id(), username: "Owner", role: "owner", lifetimeXP: 100, nameVisibility: "private", email: "private@example.com", moderationReason: "Private reason" };
  t.mock.method(User, "findOne", () => query(user, (fields) => assert.ok(fields.split(" ").includes("role"))));
  t.mock.method(User, "findById", () => query({ ...user, accountStatus: "active" }));
  t.mock.method(User, "countDocuments", async () => 0);
  t.mock.method(Friendship, "findOne", () => query(null));
  let response;
  let error;
  await getPublicUser({ params: { userId: user._id.toString() }, user: { userId: id().toString() } }, {
    status(code) { assert.equal(code, 200); return this; },
    json(value) { response = value; },
  }, (result) => { error = result; });
  assert.equal(error, undefined);
  assert.equal(response.user.role, "owner");
  assert.equal(response.user.email, undefined);
  assert.equal(response.user.moderationReason, undefined);
});

test("leaderboard and friend list responses carry roles for icon badges", async (t) => {
  const user = { _id: id(), username: "Staff", role: "moderator", lifetimeXP: 100, faction: null };
  const selectRole = (fields) => assert.ok(fields.split(" ").includes("role"));
  t.mock.method(User, "find", () => query([user], selectRole));
  t.mock.method(User, "findOne", () => query(user, selectRole));
  t.mock.method(User, "countDocuments", async () => 1);
  const global = await getGlobalLeaderboard({ page: 1, limit: 25 });
  assert.equal(global.leaderboard[0].role, "moderator");
  assert.equal((await getCurrentUserLeaderboardPosition(user._id)).role, "moderator");
  t.mock.method(Friendship, "aggregate", async (pipeline) => {
    const lookup = pipeline.find((stage) => stage.$lookup).$lookup;
    assert.equal(lookup.pipeline.find((stage) => stage.$project).$project.role, 1);
    return [{ rows: [{ _id: id(), user, acceptedAt: new Date() }], total: [{ count: 1 }] }];
  });
  t.mock.method(User, "populate", async () => {});
  const friends = await getFriends({ userId: id().toString() });
  assert.equal(friends.friends[0].user.role, "moderator");
});
