import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import User from "../src/models/User.js";
import ActivityEvent from "../src/models/ActivityEvent.js";
import NotificationState from "../src/models/NotificationState.js";
import { getNotificationVisibility, getNotifications, getUnreadNotificationCount, updateNotificationState, NOTIFICATION_TYPES } from "../src/services/notification.service.js";
import { notificationUpdateSchema } from "../src/middleware/validators/notification.validators.js";

const userId = new mongoose.Types.ObjectId();
const faction = new mongoose.Types.ObjectId();
const createdAt = new Date("2026-01-01T00:00:00Z");
const query = (value) => ({ select() { return this; }, sort() { return this; }, skip() { return this; }, limit() { return this; }, lean: async () => value });
function mockUser(t) { t.mock.method(User, "findById", () => query({ faction, accountStatus: "active", createdAt })); }

test("only agreed notifications are visible to the owner, faction members, or all users", async (t) => {
  mockUser(t);
  const filter = await getNotificationVisibility(userId);
  assert.equal(NOTIFICATION_TYPES.includes("achievement_unlocked"), false);
  assert.equal(NOTIFICATION_TYPES.includes("workout_completed"), false);
  assert.equal(NOTIFICATION_TYPES.includes("wotw_launched"), true);
  assert.deepEqual(filter.$or[0], { audience: "personal", recipient: userId });
  assert.deepEqual(filter.$or[2], { audience: "faction", faction, occurredAt: { $gte: createdAt } });
  t.mock.method(User, "findById", () => query(null));
  await assert.rejects(() => getNotificationVisibility(userId), /User not found/);
});

test("list and unread count exclude dismissed items and respect saved read state", async (t) => {
  mockUser(t);
  const readId = new mongoose.Types.ObjectId(), dismissedId = new mongoose.Types.ObjectId(), unreadId = new mongoose.Types.ObjectId();
  t.mock.method(NotificationState, "find", (filter) => { assert.deepEqual(filter, { user: userId }); return query([{ event: readId, readAt: new Date() }, { event: dismissedId, dismissedAt: new Date() }]); });
  const filters = [];
  t.mock.method(ActivityEvent, "find", (filter) => { filters.push(filter); return query([{ _id: readId }, { _id: unreadId }]); });
  t.mock.method(ActivityEvent, "countDocuments", async (filter) => filter._id.$nin.length === 1 ? 2 : 1);
  const result = await getNotifications({ userId });
  assert.equal(result.notifications[0].read, true);
  assert.equal(result.notifications[1].read, false);
  assert.equal(result.unreadCount, 1);
  assert.deepEqual(filters[0]._id.$nin, [dismissedId]);
  await getNotifications({ userId, unreadOnly: true });
  assert.deepEqual(filters[1]._id.$nin, [dismissedId, readId]);
  assert.deepEqual(await getUnreadNotificationCount(userId), { unreadCount: 1 });
});

test("read and dismiss persist per-user state and preserve dismissals when marking read", async (t) => {
  mockUser(t);
  const eventId = new mongoose.Types.ObjectId();
  t.mock.method(ActivityEvent, "find", () => query([{ _id: eventId }]));
  const writes = [];
  t.mock.method(NotificationState, "bulkWrite", async (operations) => { writes.push(operations); });
  await updateNotificationState({ userId, eventIds: [eventId.toString()], dismiss: true });
  assert.deepEqual(writes[0][0].updateOne.filter, { user: userId, event: eventId });
  assert.ok(writes[0][0].updateOne.update.$set.dismissedAt instanceof Date);
  await updateNotificationState({ userId, eventIds: [eventId.toString()] });
  assert.equal(writes[1][0].updateOne.update.$set.dismissedAt, undefined);
  assert.equal(writes[1][0].updateOne.upsert, true);
});

test("foreign or missing notifications cannot be changed", async (t) => {
  mockUser(t);
  t.mock.method(ActivityEvent, "find", (filter) => { assert.equal(filter.$or[0].recipient, userId); return query([]); });
  t.mock.method(NotificationState, "bulkWrite", async () => assert.fail("Unauthorized write"));
  await assert.rejects(() => updateNotificationState({ userId, eventIds: [new mongoose.Types.ObjectId().toString()] }), /not found/);
});

test("clear all handles unloaded notifications in batches and captures a cutoff", async (t) => {
  mockUser(t);
  t.mock.method(ActivityEvent, "find", (filter) => { assert.ok(filter.occurredAt.$lte instanceof Date); return query(Array.from({ length: 501 }, () => ({ _id: new mongoose.Types.ObjectId() }))); });
  const sizes = [];
  t.mock.method(NotificationState, "bulkWrite", async (operations) => { sizes.push(operations.length); });
  await updateNotificationState({ userId, all: true, dismiss: true });
  assert.deepEqual(sizes, [500, 1]);
});

test("mutation request requires IDs or all, forbidding duplicates and injected user IDs", () => {
  const body = notificationUpdateSchema.body;
  assert.equal(body.validate({ all: true }).error, undefined);
  assert.ok(body.validate({}).error);
  assert.ok(body.validate({ all: true, eventIds: [userId.toString()] }).error);
  assert.ok(body.validate({ eventIds: [userId.toString(), userId.toString()] }).error);
  assert.ok(body.validate({ all: true, userId: userId.toString() }).error);
});
