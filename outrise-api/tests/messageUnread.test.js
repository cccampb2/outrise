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
import Conversation from "../src/models/Conversation.js";
import Message from "../src/models/Message.js";
import User from "../src/models/User.js";
import Friendship from "../src/models/Friendship.js";
import ActivityEvent from "../src/models/ActivityEvent.js";
import NotificationState from "../src/models/NotificationState.js";
import {
  getConversations,
  getUnreadMessageCount,
  markConversationRead,
  sendMessage,
} from "../src/services/message.service.js";
import { markConversationReadSchema } from "../src/middleware/validators/message.validators.js";
import { NOTIFICATION_TYPES } from "../src/services/notification.service.js";
const id = () => new mongoose.Types.ObjectId();
function query(value) {
  return {
    select() {
      return this;
    },
    session() {
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
    lean: async () => value,
    distinct: async () => value,
    then(resolve, reject) {
      return Promise.resolve(value).then(resolve, reject);
    },
  };
}
test("unread counts are scoped to owned conversations and exclude own or already-read messages", async (t) => {
  const userId = id(),
    conversationId = id();
  t.mock.method(Conversation, "find", (filter) => {
    assert.equal(filter.$or[0].userLow, userId);
    return query([conversationId]);
  });
  t.mock.method(Message, "countDocuments", async (filter) => {
    assert.deepEqual(filter.conversation.$in, [conversationId]);
    assert.equal(filter.sender.$ne.toString(), userId.toString());
    assert.equal(filter.readBy.$ne.toString(), userId.toString());
    return 3;
  });
  assert.deepEqual(await getUnreadMessageCount(userId), { unreadCount: 3 });
});
test("conversation list includes each chat's unread count and keeps count zero for read chats", async (t) => {
  const userId = id(),
    a = id(),
    b = id();
  t.mock.method(Conversation, "find", () => query([{ _id: a }, { _id: b }]));
  t.mock.method(Message, "aggregate", async (pipeline) => {
    assert.deepEqual(pipeline[0].$match.conversation.$in, [a, b]);
    return [{ _id: a, unreadCount: 2 }];
  });
  const result = await getConversations({ userId });
  assert.deepEqual(
    result.conversations.map((row) => row.unreadCount),
    [2, 0],
  );
});
test("marking a chat read acknowledges only fetched history and preserves dismissed notification state", async (t) => {
  const userId = id(),
    other = id(),
    conversationId = id(),
    throughMessageId = id(),
    eventId = id();
  const createdAt = new Date("2026-10-05T12:00:00Z");
  t.mock.method(Conversation, "findOne", (filter) => {
    assert.equal(filter._id, conversationId);
    assert.equal(filter.$or[0].userLow, userId);
    return query({ userLow: userId, userHigh: other });
  });
  t.mock.method(Message, "findOne", (filter) => {
    assert.equal(filter.conversation, conversationId);
    return query({ _id: throughMessageId, createdAt });
  });
  t.mock.method(Message, "updateMany", async (filter, update) => {
    assert.equal(filter.sender.$ne, userId);
    assert.equal(filter.$or[0].createdAt.$lt, createdAt);
    assert.equal(filter.$or[1]._id.$lte, throughMessageId);
    assert.deepEqual(update, { $addToSet: { readBy: userId } });
  });
  t.mock.method(ActivityEvent, "find", (filter) => {
    assert.equal(filter.recipient, userId);
    assert.equal(filter["details.conversationId"], conversationId);
    assert.equal(filter.$or[1].sourceId.$lte, throughMessageId);
    return query([{ _id: eventId }]);
  });
  let writes = 0;
  t.mock.method(NotificationState, "bulkWrite", async (operations) => {
    writes++;
    assert.equal(operations[0].updateOne.update.$set.dismissedAt, undefined);
    assert.ok(operations[0].updateOne.update.$set.readAt instanceof Date);
  });
  await markConversationRead({ userId, conversationId, throughMessageId });
  await markConversationRead({ userId, conversationId, throughMessageId });
  assert.equal(writes, 2);
});
test("foreign conversations and a message from another chat cannot be marked read", async (t) => {
  const input = { userId: id(), conversationId: id(), throughMessageId: id() };
  t.mock.method(Conversation, "findOne", () => query(null));
  t.mock.method(Message, "updateMany", () => assert.fail("Unauthorized write"));
  await assert.rejects(
    () => markConversationRead(input),
    (error) => error.statusCode === 404,
  );
  t.mock.method(Conversation, "findOne", () =>
    query({ userLow: input.userId }),
  );
  t.mock.method(Message, "findOne", () => query(null));
  await assert.rejects(
    () => markConversationRead(input),
    (error) => error.statusCode === 404,
  );
  assert.ok(
    markConversationReadSchema.body.validate({ throughMessageId: "invalid" })
      .error,
  );
  assert.ok(
    markConversationReadSchema.body.validate({
      throughMessageId: String(id()),
      userId: String(id()),
    }).error,
  );
});
test("new messages save one recipient-only notification in the same transaction, and retries do not create another", async (t) => {
  const userId = id(),
    other = id(),
    conversationId = id();
  const session = {
    withTransaction: async (fn) => fn(),
    endSession: async () => {},
  };
  t.mock.method(mongoose, "startSession", async () => session);
  t.mock.method(Conversation, "findOne", () =>
    query({ userLow: userId, userHigh: other }),
  );
  t.mock.method(Conversation, "updateOne", async () => ({ matchedCount: 1 }));
  t.mock.method(Friendship, "findOne", () => query({ status: "accepted" }));
  t.mock.method(User, "findById", () => query({ username: "Caleb" }));
  t.mock.method(User, "updateOne", async () => ({ matchedCount: 1 }));
  let saved,
    eventCount = 0;
  t.mock.method(Message, "findOne", () => query(saved ?? null));
  t.mock.method(Message, "create", async ([input], options) => {
    assert.equal(options.session, session);
    saved = new Message(input);
    saved.createdAt = new Date();
    return [saved];
  });
  t.mock.method(
    ActivityEvent,
    "findOneAndUpdate",
    async (_filter, update, options) => {
      eventCount++;
      const event = update.$setOnInsert;
      assert.equal(options.session, session);
      assert.equal(event.recipient, other);
      assert.equal(event.sourceId, saved._id);
      assert.equal(event.details.conversationId, conversationId);
      assert.equal(event.details.message, undefined);
      return event;
    },
  );
  const input = {
    userId,
    conversationId,
    text: "Hello",
    idempotencyKey: "attempt-1",
  };
  await sendMessage(input);
  await sendMessage(input);
  assert.equal(eventCount, 1);
  await assert.rejects(
    () => sendMessage({ ...input, text: "Different" }),
    (error) => error.statusCode === 409,
  );
});
test("message notification schema requires its destination and supports bell visibility", async () => {
  const event = {
    type: "message_received",
    audience: "personal",
    actor: id(),
    recipient: id(),
    sourceType: "message",
    sourceId: id(),
    details: { actorUsername: "Alex", conversationId: id() },
    idempotencyKey: "test",
  };
  await new ActivityEvent(event).validate();
  await assert.rejects(() =>
    new ActivityEvent({
      ...event,
      details: { actorUsername: "Alex" },
    }).validate(),
  );
  await assert.rejects(() =>
    new ActivityEvent({ ...event, audience: "friends" }).validate(),
  );
  assert.ok(NOTIFICATION_TYPES.includes("message_received"));
});
