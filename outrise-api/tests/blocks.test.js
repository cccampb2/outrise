import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import UserBlock from "../src/models/UserBlock.js";
import User from "../src/models/User.js";
import Friendship from "../src/models/Friendship.js";
import Conversation from "../src/models/Conversation.js";
import Message from "../src/models/Message.js";
import ActivityEvent from "../src/models/ActivityEvent.js";
import ActivityDismissal from "../src/models/ActivityDismissal.js";
import {
  blockUser,
  unblockUser,
  getBlockRelationship,
  getBlockedUsers,
  getBlockedUserIds,
} from "../src/services/block.service.js";
import {
  sendFriendRequest,
  acceptFriendRequest,
  getFriends,
} from "../src/services/friend.service.js";
import {
  sendMessage,
  getConversationMessages,
  getUnreadMessageCount,
  getConversations,
} from "../src/services/message.service.js";
import { getNotificationVisibility } from "../src/services/notification.service.js";
import { getActivityFeed } from "../src/services/activity.service.js";
import { searchUsers } from "../src/controllers/user.controller.js";
import { blockUserController } from "../src/controllers/block.controller.js";
import routes from "../src/routes/user.routes.js";
import { authenticate } from "../src/middleware/auth.js";

const a = new mongoose.Types.ObjectId(),
  b = new mongoose.Types.ObjectId(),
  c = new mongoose.Types.ObjectId();
function query(value) {
  return {
    select() {
      return this;
    },
    session() {
      return this;
    },
    lean() {
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
    distinct() {
      return this;
    },
    then(resolve, reject) {
      return Promise.resolve(value).then(resolve, reject);
    },
  };
}
function blocks(t, rows) {
  t.mock.method(UserBlock, "find", () => query(rows));
}
function transaction(t) {
  const session = {
    withTransaction: async (fn) => fn(),
    endSession: async () => {},
  };
  t.mock.method(mongoose, "startSession", async () => session);
  return session;
}

test("blocking is directional in storage but contact restrictions apply in both directions", async (t) => {
  blocks(t, [{ blocker: a, blocked: b }]);
  assert.deepEqual(await getBlockRelationship({ userId: a, otherUserId: b }), {
    blocked: true,
    blockedByMe: true,
  });
  assert.deepEqual(await getBlockRelationship({ userId: b, otherUserId: a }), {
    blocked: true,
    blockedByMe: false,
  });
  assert.deepEqual(await getBlockedUserIds(a), [b]);
  assert.deepEqual(await getBlockedUserIds(b), [a]);
});
test("blocking atomically saves the block and removes friendship or requests without deleting chat history", async (t) => {
  const session = transaction(t);
  const locks = [];
  t.mock.method(User, "updateOne", async (filter, update, options) => {
    assert.equal(options.session, session);
    locks.push(filter._id);
    return { matchedCount: 1 };
  });
  let saved = 0,
    removed = 0;
  t.mock.method(UserBlock, "updateOne", async (filter, update, options) => {
    assert.deepEqual(filter, { blocker: a, blocked: b });
    assert.equal(options.upsert, true);
    assert.equal(options.session, session);
    saved++;
  });
  t.mock.method(Friendship, "deleteMany", async (filter, options) => {
    assert.equal(filter.$or.length, 2);
    assert.equal(options.session, session);
    removed++;
  });
  t.mock.method(Message, "deleteMany", () => {
    throw Error("Must retain messages");
  });
  t.mock.method(Conversation, "updateMany", () => {
    throw Error("Must not permanently close conversation");
  });
  await blockUser({ userId: a, otherUserId: b });
  await blockUser({ userId: a, otherUserId: b });
  assert.equal(saved, 2);
  assert.equal(removed, 2);
  assert.equal(locks.length, 4);
});
test("self-blocks and missing users are rejected before a block is saved", async (t) => {
  await assert.rejects(
    blockUser({ userId: a, otherUserId: a }),
    (error) => error.statusCode === 400,
  );
  transaction(t);
  t.mock.method(User, "updateOne", async () => ({ matchedCount: 0 }));
  t.mock.method(UserBlock, "updateOne", () => {
    throw Error("Must not save");
  });
  await assert.rejects(
    blockUser({ userId: a, otherUserId: b }),
    (error) => error.statusCode === 404,
  );
});
test("unblocking removes only the caller's block and does not recreate a friendship", async (t) => {
  let filter;
  t.mock.method(UserBlock, "deleteOne", async (value) => {
    filter = value;
  });
  t.mock.method(Friendship, "create", () => {
    throw Error("Must not restore friendship");
  });
  await unblockUser({ userId: a, otherUserId: b });
  assert.deepEqual(filter, { blocker: a, blocked: b });
});
test("blocked users cannot send or accept friend requests in either direction", async (t) => {
  blocks(t, [{ blocker: a, blocked: b }]);
  await assert.rejects(
    sendFriendRequest({ requesterId: a, recipientId: b }),
    (error) => error.statusCode === 403,
  );
  await assert.rejects(
    sendFriendRequest({ requesterId: b, recipientId: a }),
    (error) => error.statusCode === 403,
  );
  t.mock.method(Friendship, "findOne", () => query({ requester: a }));
  await assert.rejects(
    acceptFriendRequest({ userId: b, requestId: c }),
    (error) => error.statusCode === 403,
  );
});
test("blocked message sends are rejected before an idempotent retry can return a prior message", async (t) => {
  blocks(t, [{ blocker: a, blocked: b }]);
  t.mock.method(Conversation, "findOne", () =>
    query({ userLow: a, userHigh: b }),
  );
  t.mock.method(Message, "findOne", () => {
    throw Error("Should reject before reading retry");
  });
  for (const userId of [a, b])
    await assert.rejects(
      sendMessage({
        userId,
        conversationId: c,
        text: "Hello",
        idempotencyKey: "one",
      }),
      (error) => error.statusCode === 403,
    );
});
test("blocked conversations retain readable history and report temporary blocking separately from deletion", async (t) => {
  blocks(t, [{ blocker: a, blocked: b }]);
  t.mock.method(Conversation, "findOne", () =>
    query({ userLow: a, userHigh: b, closedAt: null }),
  );
  t.mock.method(Message, "find", () =>
    query([{ _id: c, text: "Existing message" }]),
  );
  const result = await getConversationMessages({
    userId: a,
    conversationId: c,
  });
  assert.equal(result.messages[0].text, "Existing message");
  assert.equal(result.blocked, true);
  assert.equal(result.blockedByMe, true);
  assert.equal(result.conversationClosed, false);
  assert.equal(result.otherUserId, b);
});
test("blocked contacts are excluded from unread totals and chat badges", async (t) => {
  blocks(t, [{ blocker: a, blocked: b }]);
  t.mock.method(Conversation, "find", (filter) => {
    if (filter.userLow?.$nin) {
      assert.deepEqual(filter.userLow.$nin, [b]);
      assert.deepEqual(filter.userHigh.$nin, [b]);
      return query([]);
    }
    return query([{ _id: c, userLow: { _id: a }, userHigh: { _id: b } }]);
  });
  t.mock.method(Message, "countDocuments", async (filter) => {
    assert.deepEqual(filter.conversation.$in, []);
    return 0;
  });
  t.mock.method(Message, "aggregate", async () => [{ _id: c, unreadCount: 8 }]);
  assert.deepEqual(await getUnreadMessageCount(a), { unreadCount: 0 });
  const result = await getConversations({ userId: a });
  assert.equal(result.conversations[0].blocked, true);
  assert.equal(result.conversations[0].unreadCount, 0);
});
test("search and friends filter blocked users before pagination", async (t) => {
  blocks(t, [{ blocker: a, blocked: b }]);
  t.mock.method(User, "find", (filter) => {
    assert.deepEqual(filter._id.$nin, [b]);
    return query([]);
  });
  t.mock.method(User, "countDocuments", async (filter) => {
    assert.deepEqual(filter._id.$nin, [b]);
    return 0;
  });
  let result;
  await searchUsers(
    { user: { userId: a }, query: { query: "athlete" } },
    {
      status() {
        return this;
      },
      json(value) {
        result = value;
      },
    },
    (error) => {
      throw error;
    },
  );
  assert.equal(result.pagination.totalUsers, 0);
  t.mock.method(Friendship, "aggregate", async (pipeline) => {
    assert.deepEqual(pipeline[2].$match.otherUserId.$nin, [b]);
    return [{ rows: [], total: [] }];
  });
  t.mock.method(User, "populate", async () => {});
  assert.equal((await getFriends({ userId: a })).friends.length, 0);
});
test("activity and notifications exclude blocked actors, including personal events", async (t) => {
  blocks(t, [{ blocker: a, blocked: b }]);
  t.mock.method(User, "findById", () =>
    query({ accountStatus: "active", createdAt: new Date(), faction: null }),
  );
  const visibility = await getNotificationVisibility(a);
  assert.deepEqual(visibility.actor.$nin, [b]);
  t.mock.method(Friendship, "find", () => query([]));
  t.mock.method(User, "find", () => query([a]));
  t.mock.method(ActivityDismissal, "find", () => query([]));
  t.mock.method(ActivityEvent, "find", (filter) => {
    assert.deepEqual(filter.actor.$nin, [b]);
    return query([]);
  });
  t.mock.method(ActivityEvent, "countDocuments", async (filter) => {
    assert.deepEqual(filter.actor.$nin, [b]);
    return 0;
  });
  assert.equal((await getActivityFeed({ userId: a })).events.length, 0);
});
test("blocked list belongs to caller and paginates without exposing other users' block lists", async (t) => {
  t.mock.method(UserBlock, "find", (filter) => {
    assert.deepEqual(filter, { blocker: a });
    return query([
      { blocked: { _id: b, username: "Athlete" }, createdAt: new Date() },
      { blocked: { _id: c, username: "Other" } },
    ]);
  });
  const result = await getBlockedUsers({ userId: a, limit: 1 });
  assert.equal(result.users.length, 1);
  assert.equal(result.users[0].id, b);
  assert.equal(result.pagination.hasMore, true);
});
test("block endpoints require authentication and socket updates target only the two accounts", async (t) => {
  for (const [url, method] of [
    ["/me/blocked-users", "get"],
    ["/:userId/block", "get"],
    ["/:userId/block", "put"],
    ["/:userId/block", "delete"],
  ]) {
    const route = routes.stack.find(
      (layer) => layer.route?.path === url && layer.route.methods[method],
    ).route;
    assert.equal(route.stack[0].handle, authenticate);
  }
  transaction(t);
  t.mock.method(User, "updateOne", async () => ({ matchedCount: 1 }));
  t.mock.method(UserBlock, "updateOne", async () => {});
  t.mock.method(Friendship, "deleteMany", async () => {});
  const rooms = [];
  const io = {
    to(room) {
      rooms.push(room);
      return this;
    },
    emit(event) {
      assert.equal(event, "contacts:updated");
    },
  };
  await blockUserController(
    { user: { userId: a }, params: { userId: b }, app: { get: () => io } },
    {
      status(code) {
        assert.equal(code, 204);
        return this;
      },
      send() {},
    },
    (error) => {
      throw error;
    },
  );
  assert.deepEqual(rooms, [`user:${a}`, `user:${b}`]);
});

test("a block appearing during a send is rechecked inside the transaction before saving", async (t) => {
  let reads = 0;
  t.mock.method(UserBlock, "find", () =>
    query(++reads === 1 ? [] : [{ blocker: a, blocked: b }]),
  );
  t.mock.method(Conversation, "findOne", () =>
    query({ userLow: a, userHigh: b }),
  );
  t.mock.method(Message, "findOne", () => query(null));
  t.mock.method(Friendship, "findOne", () => query({ status: "accepted" }));
  t.mock.method(User, "updateOne", async () => ({ matchedCount: 1 }));
  t.mock.method(Message, "create", () => {
    throw Error("Must not save after block");
  });
  transaction(t);
  await assert.rejects(
    sendMessage({
      userId: a,
      conversationId: c,
      text: "Hello",
      idempotencyKey: "race",
    }),
    (error) => error.statusCode === 403,
  );
});
