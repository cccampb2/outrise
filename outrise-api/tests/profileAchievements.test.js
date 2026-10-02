import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import User from "../src/models/User.js";
import UserAchievement from "../src/models/UserAchievement.js";
import Achievement from "../src/models/Achievement.js";
import { getProfileAchievements } from "../src/services/profileRecords.service.js";

test("catalog hides unearned secrets and inactive locked entries, preserving earned secrets", async (t) => {
  const userId = new mongoose.Types.ObjectId();
  const earnedId = new mongoose.Types.ObjectId();
  const lockedId = new mongoose.Types.ObjectId();
  const date = new Date();
  t.mock.method(User, "exists", async () => ({ _id: userId }));
  t.mock.method(UserAchievement, "find", (filter) => {
    assert.deepEqual(filter, { user: userId });
    return { select: () => ({ lean: async () => [{ achievement: earnedId, unlockedAt: date }] }) };
  });
  const expectedFilter = { $or: [{ isActive: true, isSecret: false }, { _id: { $in: [earnedId] } }] };
  t.mock.method(Achievement, "find", (filter) => {
    assert.deepEqual(filter, expectedFilter);
    return { sort() { return this; }, skip(value) { assert.equal(value, 0); return this; }, limit(value) { assert.equal(value, 18); return this; }, select(value) { assert.equal(value, "name description category badgeKey isSecret"); return this; }, lean: async () => [{ _id: lockedId, isSecret: false, name: "Locked" }, { _id: earnedId, isSecret: true, name: "Earned secret" }] };
  });
  t.mock.method(Achievement, "countDocuments", async (filter) => { assert.deepEqual(filter, expectedFilter); return 2; });
  const result = await getProfileAchievements({ userId, page: 1, limit: 18, view: "catalog" });
  assert.equal(result.achievements[0].unlocked, false);
  assert.equal(result.achievements[0].unlockedAt, null);
  assert.equal(result.achievements[1].unlocked, true);
  assert.equal(result.achievements[1].unlockedAt, date);
  assert.equal(result.achievements[1].achievement.isSecret, true);
  assert.equal(result.pagination.total, 2);
});

test("profile preview still returns only earned achievements", async (t) => {
  const userId = new mongoose.Types.ObjectId();
  t.mock.method(User, "exists", async () => ({ _id: userId }));
  t.mock.method(UserAchievement, "find", (filter) => {
    assert.deepEqual(filter, { user: userId });
    return { sort() { return this; }, skip() { return this; }, limit(value) { assert.equal(value, 6); return this; }, select() { return this; }, populate(path, fields) { assert.ok(fields.includes("isSecret")); return this; }, lean: async () => [{ _id: "unlock", unlockedAt: new Date(), achievement: { isSecret: true } }] };
  });
  t.mock.method(UserAchievement, "countDocuments", async () => 1);
  const result = await getProfileAchievements({ userId, page: 1, limit: 6 });
  assert.equal(result.achievements[0].unlocked, true);
  assert.equal(result.pagination.total, 1);
});
