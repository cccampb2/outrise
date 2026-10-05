import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import User from "../src/models/User.js";
import SystemMessage from "../src/models/SystemMessage.js";
import ActivityEvent from "../src/models/ActivityEvent.js";
import NotificationState from "../src/models/NotificationState.js";
import {
  publishSystemMessage,
  getSystemMessages,
  getSystemMessage,
  getUnreadSystemMessageCount,
  markSystemMessagesRead,
} from "../src/services/systemMessage.service.js";
import { publishSystemMessageController } from "../src/controllers/systemMessage.controller.js";
import {
  publishSystemMessageSchema,
  getSystemMessagesSchema,
  markSystemMessagesReadSchema,
} from "../src/middleware/validators/systemMessage.validators.js";
import { NOTIFICATION_TYPES } from "../src/services/notification.service.js";

const id = () => new mongoose.Types.ObjectId();
const joinedAt = new Date("2026-10-01T00:00:00Z");
const publishedAt = new Date("2026-10-05T12:00:00Z");
function query(value) {
  return {
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
    lean: async () => value,
    distinct: async () => value,
    then(resolve, reject) {
      return Promise.resolve(value).then(resolve, reject);
    },
  };
}
function viewer(t, role = "user", accountStatus = "active") {
  t.mock.method(User, "findById", () =>
    query({ role, accountStatus, createdAt: joinedAt }),
  );
}

function publication(t) {
  const userId = id();
  viewer(t, "owner");
  let saved = null;
  let event = null;
  let writes = 0;
  let events = 0;
  let ended = 0;
  const session = {
    withTransaction: async (callback) => {
      const previous = { saved, event };
      try {
        return await callback();
      } catch (error) {
        saved = previous.saved;
        event = previous.event;
        throw error;
      }
    },
    endSession: async () => {
      ended++;
    },
  };
  t.mock.method(mongoose, "startSession", async () => session);
  t.mock.method(SystemMessage, "findOne", () => query(saved));
  t.mock.method(SystemMessage, "create", async ([input], options) => {
    assert.equal(options.session, session);
    assert.equal(input.createdBy, userId);
    writes++;
    saved = new SystemMessage(input);
    saved.createdAt = publishedAt;
    await saved.validate();
    return [saved];
  });
  t.mock.method(ActivityEvent, "findOne", () => query(event));
  t.mock.method(
    ActivityEvent,
    "findOneAndUpdate",
    async (_filter, update, options) => {
      assert.equal(options.session, session);
      events++;
      event = new ActivityEvent(update.$setOnInsert);
      await event.validate();
      return event;
    },
  );
  return {
    input: {
      userId,
      title: "New exercises",
      text: "Try the expanded exercise library.",
      idempotencyKey: "announcement-test",
    },
    state: () => ({ saved, event, writes, events, ended }),
  };
}

test("only accessible owner accounts may publish announcements or read owner history", async (t) => {
  const input = {
    userId: id(),
    title: "Update",
    text: "Hello members",
    idempotencyKey: "test",
  };
  t.mock.method(SystemMessage, "create", () =>
    assert.fail("Unauthorized publication"),
  );
  for (const role of ["user", "moderator", "admin"]) {
    viewer(t, role);
    await assert.rejects(
      () => publishSystemMessage(input),
      (error) => error.statusCode === 403,
    );
    await assert.rejects(
      () => getSystemMessages({ userId: input.userId, ownerHistory: true }),
      (error) => error.statusCode === 403,
    );
  }
  viewer(t, "owner", "banned");
  await assert.rejects(
    () => publishSystemMessage(input),
    (error) => error.statusCode === 404,
  );
});

test("publishing saves one shared message and one global notification in the same transaction", async (t) => {
  const fixture = publication(t);
  const result = await publishSystemMessage(fixture.input);
  const state = fixture.state();
  assert.equal(result.created, true);
  assert.equal(state.writes, 1);
  assert.equal(state.events, 1);
  assert.equal(state.ended, 1);
  assert.equal(state.event.audience, "global");
  assert.equal(state.event.actor, null);
  assert.equal(state.event.recipient, null);
  assert.equal(String(state.event.sourceId), String(state.saved._id));
  assert.equal(state.event.details.announcementTitle, fixture.input.title);
  assert.equal(result.systemMessage.eventId, state.event._id);
  assert.equal(result.systemMessage.createdBy, undefined);
  assert.equal(result.systemMessage.idempotencyKey, undefined);
});

test("a retry returns the original publication and changed content with the same key is rejected", async (t) => {
  const fixture = publication(t);
  const first = await publishSystemMessage(fixture.input);
  const retry = await publishSystemMessage({
    ...fixture.input,
    title: ` ${fixture.input.title} `,
  });
  assert.equal(retry.created, false);
  assert.equal(
    String(first.systemMessage._id),
    String(retry.systemMessage._id),
  );
  assert.equal(fixture.state().writes, 1);
  assert.equal(fixture.state().events, 1);
  await assert.rejects(
    () => publishSystemMessage({ ...fixture.input, text: "Different content" }),
    (error) => error.statusCode === 409,
  );
});

test("notification failure rolls back the message and still closes the transaction session", async (t) => {
  const fixture = publication(t);
  t.mock.method(ActivityEvent, "findOneAndUpdate", async () => {
    throw new Error("Notification write failed");
  });
  await assert.rejects(
    () => publishSystemMessage(fixture.input),
    /Notification write failed/,
  );
  assert.equal(fixture.state().saved, null);
  assert.equal(fixture.state().event, null);
  assert.equal(fixture.state().ended, 1);
});

test("concurrent duplicate-key publication recovers the already committed announcement", async (t) => {
  const fixture = publication(t);
  const existing = new SystemMessage({
    ...fixture.input,
    createdBy: fixture.input.userId,
  });
  existing.createdAt = publishedAt;
  const eventId = id();
  let lookups = 0;
  t.mock.method(SystemMessage, "findOne", () =>
    query(++lookups === 1 ? null : existing),
  );
  t.mock.method(SystemMessage, "create", async () => {
    const error = new Error("Duplicate");
    error.code = 11000;
    throw error;
  });
  t.mock.method(ActivityEvent, "findOne", () => query({ _id: eventId }));
  const result = await publishSystemMessage(fixture.input);
  assert.equal(result.created, false);
  assert.equal(result.systemMessage._id, existing._id);
  assert.equal(result.systemMessage.eventId, eventId);
  assert.equal(fixture.state().ended, 1);
});

test("publication emits a live event after commit, while retrying does not broadcast twice", async (t) => {
  const fixture = publication(t);
  const emitted = [];
  const req = {
    user: { userId: fixture.input.userId },
    body: fixture.input,
    app: { get: () => ({ emit: (...args) => emitted.push(args) }) },
  };
  const statuses = [];
  const res = {
    status(code) {
      statuses.push(code);
      return this;
    },
    json() {},
  };
  const next = (error) => {
    throw error;
  };
  await publishSystemMessageController(req, res, next);
  await publishSystemMessageController(req, res, next);
  assert.deepEqual(statuses, [201, 200]);
  assert.equal(emitted.length, 1);
  assert.equal(emitted[0][0], "announcement:new");
  assert.deepEqual(emitted[0][1], { messageId: fixture.state().saved._id });
});

test("member inbox is scoped to join date and reports independent read state without exposing owner metadata", async (t) => {
  const userId = id();
  viewer(t);
  const a = {
    _id: id(),
    title: "First",
    text: "One",
    createdAt: publishedAt,
    createdBy: id(),
    idempotencyKey: "private-key",
  };
  const b = { _id: id(), title: "Second", text: "Two", createdAt: publishedAt };
  const eventA = id(),
    eventB = id();
  t.mock.method(SystemMessage, "find", (filter) => {
    assert.deepEqual(filter.createdAt, { $gte: joinedAt });
    return query([a, b]);
  });
  t.mock.method(SystemMessage, "countDocuments", async () => 2);
  t.mock.method(ActivityEvent, "find", (filter) => {
    assert.equal(filter.type, "system_announcement");
    assert.equal(filter.audience, "global");
    assert.deepEqual(filter.sourceId.$in, [a._id, b._id]);
    return query([
      { _id: eventA, sourceId: a._id },
      { _id: eventB, sourceId: b._id },
    ]);
  });
  t.mock.method(NotificationState, "find", (filter) => {
    assert.equal(filter.user, userId);
    return query(
      filter.event ? [{ event: eventA, readAt: publishedAt }] : [eventA],
    );
  });
  t.mock.method(ActivityEvent, "countDocuments", async (filter) => {
    assert.equal(filter.type, "system_announcement");
    assert.equal(filter.audience, "global");
    assert.deepEqual(filter._id.$nin, [eventA]);
    assert.deepEqual(filter.$or[1].occurredAt, { $gte: joinedAt });
    return 1;
  });
  const result = await getSystemMessages({ userId });
  assert.equal(result.unreadCount, 1);
  assert.deepEqual(
    result.messages.map((message) => message.read),
    [true, false],
  );
  assert.equal(result.messages[0].createdBy, undefined);
  assert.equal(result.messages[0].idempotencyKey, undefined);
  assert.deepEqual(result.pagination, {
    page: 1,
    limit: 20,
    total: 2,
    totalPages: 1,
  });
});

test("unread announcement count excludes both read and dismissed states for that user", async (t) => {
  const userId = id();
  const readId = id(),
    dismissedId = id();
  viewer(t);
  t.mock.method(NotificationState, "find", (filter) => {
    assert.equal(filter.user, userId);
    assert.deepEqual(filter.$or, [
      { readAt: { $ne: null } },
      { dismissedAt: { $ne: null } },
    ]);
    return query([readId, dismissedId]);
  });
  t.mock.method(ActivityEvent, "countDocuments", async (filter) => {
    assert.deepEqual(filter._id.$nin, [readId, dismissedId]);
    return 2;
  });
  assert.deepEqual(await getUnreadSystemMessageCount(userId), {
    unreadCount: 2,
  });
});

test("read acknowledgement only updates announcement notifications and preserves dismissals", async (t) => {
  const userId = id(),
    eventId = id();
  viewer(t);
  t.mock.method(ActivityEvent, "find", (filter) => {
    assert.equal(filter.type, "system_announcement");
    assert.deepEqual(filter._id, { $in: [String(eventId)] });
    assert.deepEqual(filter.$or[1], {
      audience: "global",
      occurredAt: { $gte: joinedAt },
    });
    return query([{ _id: eventId }]);
  });
  t.mock.method(NotificationState, "bulkWrite", async (operations) => {
    assert.equal(operations.length, 1);
    assert.deepEqual(operations[0].updateOne.filter, {
      user: userId,
      event: eventId,
    });
    assert.ok(operations[0].updateOne.update.$set.readAt instanceof Date);
    assert.equal(operations[0].updateOne.update.$set.dismissedAt, undefined);
  });
  await markSystemMessagesRead({ userId, eventIds: [String(eventId)] });
});

test("missing or foreign-type notification IDs cannot be acknowledged as announcements", async (t) => {
  viewer(t);
  t.mock.method(ActivityEvent, "find", (filter) => {
    assert.equal(filter.type, "system_announcement");
    return query([]);
  });
  t.mock.method(NotificationState, "bulkWrite", () =>
    assert.fail("Unauthorized read state write"),
  );
  await assert.rejects(
    () => markSystemMessagesRead({ userId: id(), eventIds: [String(id())] }),
    (error) => error.statusCode === 404,
  );
});

test("direct announcement reads enforce the same join-date boundary as the inbox", async (t) => {
  viewer(t);
  t.mock.method(SystemMessage, "findOne", (filter) => {
    assert.deepEqual(filter.createdAt, { $gte: joinedAt });
    return query(null);
  });
  await assert.rejects(
    () => getSystemMessage({ userId: id(), messageId: id() }),
    (error) => error.statusCode === 404,
  );
});

test("announcement models require content, owner audit identity, and global event shape", async () => {
  const input = {
    title: "Update",
    text: "Hello",
    createdBy: id(),
    idempotencyKey: "test",
  };
  await new SystemMessage(input).validate();
  await assert.rejects(() =>
    new SystemMessage({ ...input, title: " " }).validate(),
  );
  await assert.rejects(() =>
    new SystemMessage({ ...input, createdBy: null }).validate(),
  );
  assert.ok(
    SystemMessage.schema
      .indexes()
      .some(
        ([index, options]) =>
          index.createdBy === 1 && index.idempotencyKey === 1 && options.unique,
      ),
  );
  const event = {
    type: "system_announcement",
    audience: "global",
    sourceType: "system_message",
    sourceId: id(),
    details: { announcementTitle: "Update" },
    idempotencyKey: "test",
  };
  await new ActivityEvent(event).validate();
  await assert.rejects(() =>
    new ActivityEvent({ ...event, details: {} }).validate(),
  );
  await assert.rejects(() =>
    new ActivityEvent({ ...event, actor: id() }).validate(),
  );
  await assert.rejects(() =>
    new ActivityEvent({ ...event, sourceType: "message" }).validate(),
  );
  assert.ok(NOTIFICATION_TYPES.includes("system_announcement"));
});

test("request schemas enforce content limits, pagination bounds and reject forged identity fields", () => {
  const body = {
    title: "Update",
    text: "Hello members",
    idempotencyKey: "attempt",
  };
  assert.equal(publishSystemMessageSchema.body.validate(body).error, undefined);
  assert.ok(
    publishSystemMessageSchema.body.validate({
      ...body,
      createdBy: String(id()),
    }).error,
  );
  assert.ok(
    publishSystemMessageSchema.body.validate({
      ...body,
      title: "x".repeat(121),
    }).error,
  );
  assert.ok(
    publishSystemMessageSchema.body.validate({
      ...body,
      text: "x".repeat(4001),
    }).error,
  );
  assert.ok(
    publishSystemMessageSchema.body.validate({ ...body, idempotencyKey: " " })
      .error,
  );
  assert.ok(getSystemMessagesSchema.query.validate({ limit: 51 }).error);
  assert.ok(
    getSystemMessagesSchema.query.validate({ ownerHistory: true }).error,
  );
  const eventId = String(id());
  assert.equal(
    markSystemMessagesReadSchema.body.validate({ eventIds: [eventId] }).error,
    undefined,
  );
  assert.ok(
    markSystemMessagesReadSchema.body.validate({ eventIds: [eventId, eventId] })
      .error,
  );
  assert.ok(
    markSystemMessagesReadSchema.body.validate({
      eventIds: [eventId],
      userId: String(id()),
    }).error,
  );
});
