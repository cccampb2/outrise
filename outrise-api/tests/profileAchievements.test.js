import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import User from "../src/models/User.js";
import UserAchievement from "../src/models/UserAchievement.js";
import Achievement from "../src/models/Achievement.js";
import { getProfileAchievements } from "../src/services/profileRecords.service.js";

test("catalog includes hidden secret cards and preserves earned names without revealing secret rules", async (t) => {
  const userId = new mongoose.Types.ObjectId();
  const earnedId = new mongoose.Types.ObjectId();
  const lockedId = new mongoose.Types.ObjectId();
  const secretId = new mongoose.Types.ObjectId();
  const date = new Date();
  t.mock.method(User, "exists", async () => ({ _id: userId }));
  t.mock.method(UserAchievement, "find", (filter) => {
    assert.deepEqual(filter, { user: userId });
    return {
      select: () => ({
        lean: async () => [{ achievement: earnedId, unlockedAt: date }],
      }),
    };
  });
  const expectedFilter = {
    $or: [{ isActive: true }, { _id: { $in: [earnedId] } }],
  };
  t.mock.method(Achievement, "find", (filter) => {
    assert.deepEqual(filter, expectedFilter);
    return {
      sort() {
        return this;
      },
      skip(value) {
        assert.equal(value, 0);
        return this;
      },
      limit(value) {
        assert.equal(value, 18);
        return this;
      },
      select(value) {
        assert.equal(value, "name description category badgeKey isSecret");
        return this;
      },
      lean: async () => [
        {
          _id: lockedId,
          isSecret: false,
          name: "Locked",
          description: "Complete ten workouts",
          category: "workout",
          badgeKey: "ten-workouts",
        },
        {
          _id: earnedId,
          isSecret: true,
          name: "Earned secret",
          description: "Reach level 69",
          category: "oddity",
          badgeKey: "nice",
        },
        {
          _id: secretId,
          isSecret: true,
          name: "Midnight Side Quest",
          description: "Start a workout after 11 PM",
          category: "consistency",
          badgeKey: "midnight-side-quest",
        },
      ],
    };
  });
  t.mock.method(Achievement, "countDocuments", async (filter) => {
    assert.deepEqual(filter, expectedFilter);
    return 3;
  });
  const result = await getProfileAchievements({
    userId,
    page: 1,
    limit: 18,
    view: "catalog",
  });
  assert.equal(result.achievements[0].unlocked, false);
  assert.equal(result.achievements[0].unlockedAt, null);
  assert.equal(result.achievements[1].unlocked, true);
  assert.equal(result.achievements[1].unlockedAt, date);
  assert.equal(
    result.achievements[0].achievement.description,
    "Complete ten workouts",
  );
  assert.equal(result.achievements[0].achievement.badgeKey, "ten-workouts");
  assert.equal(result.achievements[1].achievement.isSecret, true);
  assert.equal(result.achievements[1].achievement.name, "Earned secret");
  assert.equal(result.achievements[1].achievement.description, "");
  assert.equal(result.achievements[2].unlocked, false);
  assert.equal(result.achievements[2].unlockedAt, null);
  assert.deepEqual(result.achievements[2].achievement, {
    _id: secretId,
    isSecret: true,
    name: "Secret achievement",
    description: "",
    category: "",
    badgeKey: "",
  });
  assert.deepEqual(result.pagination, {
    page: 1,
    limit: 18,
    total: 3,
    totalPages: 1,
  });
});

test("profile preview still returns only earned achievements", async (t) => {
  const userId = new mongoose.Types.ObjectId();
  t.mock.method(User, "exists", async () => ({ _id: userId }));
  t.mock.method(UserAchievement, "find", (filter) => {
    assert.deepEqual(filter, { user: userId });
    return {
      sort() {
        return this;
      },
      skip() {
        return this;
      },
      limit(value) {
        assert.equal(value, 6);
        return this;
      },
      select() {
        return this;
      },
      populate(path, fields) {
        assert.ok(fields.includes("isSecret"));
        return this;
      },
      lean: async () => [
        {
          _id: "unlock",
          unlockedAt: new Date(),
          achievement: {
            isSecret: true,
            name: "Earned secret",
            description: "Reach level 69",
            category: "oddity",
            badgeKey: "nice",
          },
        },
      ],
    };
  });
  t.mock.method(UserAchievement, "countDocuments", async () => 1);
  const result = await getProfileAchievements({ userId, page: 1, limit: 6 });
  assert.equal(result.achievements[0].unlocked, true);
  assert.equal(result.achievements[0].achievement.name, "Earned secret");
  assert.equal(result.achievements[0].achievement.description, "");
  assert.equal(result.pagination.total, 1);
});

test("catalog paginates secret placeholders even when the user has no unlocks", async (t) => {
  const userId = new mongoose.Types.ObjectId();
  const achievementId = new mongoose.Types.ObjectId();
  t.mock.method(User, "exists", async () => ({ _id: userId }));
  t.mock.method(UserAchievement, "find", () => ({
    select: () => ({ lean: async () => [] }),
  }));
  const expectedFilter = {
    $or: [{ isActive: true }, { _id: { $in: [] } }],
  };
  t.mock.method(Achievement, "find", (filter) => {
    assert.deepEqual(filter, expectedFilter);
    return {
      sort() {
        return this;
      },
      skip(value) {
        assert.equal(value, 18);
        return this;
      },
      limit(value) {
        assert.equal(value, 18);
        return this;
      },
      select() {
        return this;
      },
      lean: async () => [
        {
          _id: achievementId,
          isSecret: true,
          name: "Nice",
          description: "Reach level 69",
          category: "oddity",
          badgeKey: "nice",
        },
      ],
    };
  });
  t.mock.method(Achievement, "countDocuments", async (filter) => {
    assert.deepEqual(filter, expectedFilter);
    return 19;
  });
  const result = await getProfileAchievements({
    userId,
    page: 2,
    limit: 18,
    view: "catalog",
  });
  assert.equal(result.achievements[0].unlocked, false);
  assert.equal(result.achievements[0].achievement.name, "Secret achievement");
  assert.equal(result.achievements[0].achievement.description, "");
  assert.equal(result.pagination.total, 19);
  assert.equal(result.pagination.totalPages, 2);
});
