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
import bcrypt from "bcrypt";
import User from "../src/models/User.js";
import AccountDeletion from "../src/models/AccountDeletion.js";
import Conversation from "../src/models/Conversation.js";
import Message from "../src/models/Message.js";
import Verification from "../src/models/Verification.js";
import ActivityEvent from "../src/models/ActivityEvent.js";
import NotificationState from "../src/models/NotificationState.js";
import Season from "../src/models/Season.js";
import SeasonContribution from "../src/models/SeasonContribution.js";
import WorkoutOfTheWeek from "../src/models/WorkoutOfTheWeek.js";
import SystemMessage from "../src/models/SystemMessage.js";
import cloudinary from "../src/config/cloudinary.js";
import {
  requestAccountDeletion,
  processAccountDeletion,
} from "../src/services/accountDeletion.service.js";
import { ensureAccountAccess } from "../src/services/accountAccess.service.js";
import { getSeasonHistory } from "../src/services/season.service.js";
import {
  sendMessage,
  getConversationMessages,
} from "../src/services/message.service.js";
import { deleteAccountSchema } from "../src/middleware/validators/accountDeletion.validators.js";
import { authenticateAccountDeletion } from "../src/middleware/auth.js";
import routes from "../src/routes/user.routes.js";

const mongooseMessageUpdate = Message.updateMany;
const mongooseAnnouncementUpdate = SystemMessage.updateMany;

const userId = new mongoose.Types.ObjectId(),
  otherId = new mongoose.Types.ObjectId(),
  threadId = new mongoose.Types.ObjectId();
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
  skip() {
    return this;
  },
  limit() {
    return this;
  },
  populate() {
    return this;
  },
  lean() {
    return this;
  },
  distinct() {
    return this;
  },
  then(resolve, reject) {
    return Promise.resolve(value).then(resolve, reject);
  },
});
const member = (fields) => ({
  _id: userId,
  email: "delete@example.com",
  role: "user",
  accountStatus: "active",
  tokenVersion: 0,
  password: "hash",
  profileImage: { publicId: "profile/image" },
  ...fields,
});
function transaction(t) {
  const session = {
    withTransaction: (callback) => callback(),
    endSession: async () => {},
  };
  t.mock.method(mongoose, "startSession", async () => session);
  return session;
}

test("deletion route is authenticated, requires the password and explicit confirmation, and rejects forged identity", () => {
  const route = routes.stack.find(
    (layer) => layer.route?.path === "/me" && layer.route.methods.delete,
  ).route;
  assert.equal(route.stack[0].handle, authenticateAccountDeletion);
  for (const body of [
    {},
    { password: "x" },
    { password: "x", confirmation: "delete" },
    { password: "x", confirmation: "DELETE", userId: otherId },
  ])
    assert.ok(deleteAccountSchema.body.validate(body).error);
  assert.equal(
    deleteAccountSchema.body.validate({ password: "x", confirmation: "DELETE" })
      .error,
    undefined,
  );
});

test("wrong password cannot queue deletion or disable an account", async (t) => {
  t.mock.method(User, "findById", () => query(member()));
  t.mock.method(bcrypt, "compare", async () => false);
  transaction(t);
  t.mock.method(AccountDeletion, "create", async () => {
    throw Error("Must not save");
  });
  await assert.rejects(
    requestAccountDeletion({ userId, password: "wrong" }),
    /Password is incorrect/,
  );
  assert.equal(AccountDeletion.create.mock.callCount(), 0);
  assert.equal(mongoose.startSession.mock.callCount(), 0);
});

test("accepted deletion saves a durable upload checklist, disables login, revokes tokens, and closes shared chats", async (t) => {
  const user = member();
  const session = transaction(t);
  t.mock.method(User, "findById", () => query(user));
  t.mock.method(bcrypt, "compare", async () => true);
  t.mock.method(AccountDeletion, "findOne", () => query(null));
  t.mock.method(Verification, "find", () =>
    query([
      { proof: { publicId: "proof/video" } },
      { proof: { publicId: "proof/video" } },
    ]),
  );
  let checklist, disabled, closed;
  t.mock.method(AccountDeletion, "create", async ([input], options) => {
    checklist = input;
    assert.equal(options.session, session);
  });
  t.mock.method(User, "updateOne", async (filter, update) => {
    assert.equal(filter._id, userId);
    disabled = update;
  });
  t.mock.method(Conversation, "updateMany", async (filter, update) => {
    closed = { filter, update };
  });
  assert.equal(
    (await requestAccountDeletion({ userId, password: "correct" })).status,
    "pending",
  );
  assert.deepEqual(checklist.assets, [
    { publicId: "profile/image", resourceType: "image" },
    { publicId: "proof/video", resourceType: "video" },
  ]);
  assert.equal(checklist.password, undefined);
  assert.equal(checklist.email, undefined);
  assert.equal(disabled.$inc.tokenVersion, 1);
  assert.ok(disabled.$set.deletionRequestedAt instanceof Date);
  assert.equal(disabled.$set.accountStatus, "banned");
  assert.equal(closed.filter.$or[0].userLow, userId);
  assert.ok(closed.update.$set.closedAt instanceof Date);
  await assert.rejects(
    ensureAccountAccess({ ...user, ...disabled.$set }),
    (error) => error.code === "ACCOUNT_DELETION_PENDING",
  );
});

test("last owner is protected and a changed session cannot authorize deletion", async (t) => {
  const user = member({ role: "owner" });
  let reads = 0,
    changed = false;
  transaction(t);
  t.mock.method(User, "findById", () =>
    query({ ...user, tokenVersion: changed && ++reads > 1 ? 1 : 0 }),
  );
  t.mock.method(User, "findOne", () => query(null));
  t.mock.method(bcrypt, "compare", async () => true);
  await assert.rejects(
    requestAccountDeletion({ userId, password: "correct" }),
    /last owner/,
  );
  changed = true;
  await assert.rejects(
    requestAccountDeletion({ userId, password: "correct" }),
    /session changed/,
  );
});

async function cleanupFixture(t, assets = []) {
  const models = [];
  for (const name of [
    "Workout",
    "WorkoutSession",
    "Verification",
    "PersonalRecord",
    "UserAchievement",
    "XPtransaction",
    "SeasonContribution",
    "Suggestion",
    "AccountModeration",
    "UserRoleChange",
    "ActivityDismissal",
    "NotificationState",
    "ActivityEvent",
    "Friendship",
    "Message",
    "Conversation",
    "IssueReport",
    "WorkoutOfTheWeek",
    "WorkoutOfTheWeekOccurrence",
    "SystemMessage",
    "User",
    "AccountDeletion",
    "UserBlock",
  ]) {
    models.push((await import(`../src/models/${name}.js`)).default);
  }
  const writes = [];
  for (const model of models)
    for (const method of [
      "deleteMany",
      "deleteOne",
      "updateMany",
      "updateOne",
    ]) {
      t.mock.method(model, method, async (...args) => {
        writes.push({ model: model.modelName, method, args });
        return { matchedCount: 1, deletedCount: 1 };
      });
    }
  const job = {
    _id: new mongoose.Types.ObjectId(),
    user: userId,
    assets,
    leaseToken: "claim",
  };
  t.mock.method(AccountDeletion, "findOneAndUpdate", (filter, update) => {
    assert.ok(filter.$or);
    job.leaseToken = update.$set.leaseToken;
    return query(job);
  });
  t.mock.method(User, "findById", () =>
    query(member({ deletionRequestedAt: new Date() })),
  );
  t.mock.method(User, "exists", () => query({ _id: otherId }));
  t.mock.method(ActivityEvent, "find", () =>
    query([new mongoose.Types.ObjectId()]),
  );
  t.mock.method(Conversation, "find", () =>
    query([{ _id: threadId, userLow: userId, userHigh: otherId }]),
  );
  transaction(t);
  return { writes, job };
}

test("failed upload cleanup preserves the retry task and does not delete database records", async (t) => {
  const { writes } = await cleanupFixture(t, [
    { publicId: "video", resourceType: "video" },
  ]);
  t.mock.method(cloudinary.uploader, "destroy", async () => ({
    result: "error",
  }));
  assert.equal(await processAccountDeletion({ userId }), false);
  assert.equal(
    writes.some((write) => write.method.startsWith("delete")),
    false,
  );
  const retry = writes.find(
    (write) =>
      write.model === "AccountDeletion" && write.args[1].$set.nextAttemptAt,
  );
  assert.ok(retry.args[1].$set.nextAttemptAt instanceof Date);
  assert.equal(retry.args[1].$set.leaseToken, null);
});

test("successful cleanup removes personal records and contributions, preserves the other member's messages and app resources", async (t) => {
  const { writes } = await cleanupFixture(t, [
    { publicId: "image", resourceType: "image" },
    { publicId: "video", resourceType: "video" },
  ]);
  const assets = [];
  t.mock.method(cloudinary.uploader, "destroy", async (id, options) => {
    assets.push({ id, options });
    return { result: id === "image" ? "ok" : "not found" };
  });
  let refreshed = false;
  assert.equal(
    await processAccountDeletion({
      userId,
      io: {
        emit(event) {
          assert.equal(event, "accounts:updated");
          refreshed = true;
        },
      },
    }),
    true,
  );
  assert.deepEqual(
    assets.map((asset) => asset.options.resource_type),
    ["image", "video"],
  );
  assert.ok(assets.every((asset) => asset.options.invalidate));
  const removedMessages = writes.find(
    (write) =>
      write.model === "Message" &&
      write.method === "updateMany" &&
      write.args[0].sender,
  );
  assert.equal(removedMessages.args[0].sender, userId);
  assert.equal(removedMessages.args[1][0].$set.sender, null);
  assert.equal(removedMessages.args[1][0].$set.text, "Message removed");
  assert.doesNotThrow(() =>
    mongooseMessageUpdate.call(Message, ...removedMessages.args),
  );
  const redactedAnnouncement = writes.find(
    (write) => write.model === "SystemMessage" && write.method === "updateMany",
  );
  assert.doesNotThrow(() =>
    mongooseAnnouncementUpdate.call(
      SystemMessage,
      ...redactedAnnouncement.args,
    ),
  );

  assert.equal(
    writes.some(
      (write) => write.model === "Message" && write.method === "deleteMany",
    ),
    false,
  );
  assert.ok(
    writes.some(
      (write) =>
        write.model === "SeasonContribution" &&
        write.method === "deleteMany" &&
        write.args[0].user === userId,
    ),
  );
  assert.ok(
    writes.some(
      (write) => write.model === "NotificationState" && write.args[0].$or,
    ),
  );
  assert.ok(
    writes.some(
      (write) =>
        write.model === "SystemMessage" && write.method === "updateMany",
    ),
  );
  assert.equal(
    writes.some(
      (write) =>
        ["SystemMessage", "WorkoutOfTheWeek", "Season"].includes(write.model) &&
        write.method.startsWith("delete"),
    ),
    false,
  );
  assert.equal(writes.at(-1).model, "AccountDeletion");
  assert.ok(refreshed);
});

test("database cleanup failure leaves the task retryable and emits no success event", async (t) => {
  const { writes } = await cleanupFixture(t);
  User.deleteOne.mock.restore();
  t.mock.method(User, "deleteOne", async () => {
    throw Error("Database temporarily unavailable");
  });
  assert.equal(
    await processAccountDeletion({
      userId,
      io: {
        emit() {
          throw Error("Must not emit");
        },
      },
    }),
    false,
  );
  assert.equal(
    writes.some(
      (write) =>
        write.model === "AccountDeletion" && write.method === "deleteOne",
    ),
    false,
  );
  assert.ok(
    writes.some(
      (write) =>
        write.model === "AccountDeletion" && write.args[1].$set.nextAttemptAt,
    ),
  );
});

test("closed conversations reject sending even with an old retry key, while remaining messages stay readable", async (t) => {
  t.mock.method(Conversation, "findOne", () =>
    query({ userLow: userId, userHigh: otherId, closedAt: new Date() }),
  );
  t.mock.method(Message, "findOne", () => {
    throw Error("Must not return an old retry");
  });
  await assert.rejects(
    sendMessage({
      userId,
      conversationId: threadId,
      text: "Hello",
      idempotencyKey: "old",
    }),
    /conversation is closed/,
  );
  t.mock.method(Message, "find", () =>
    query([
      {
        _id: new mongoose.Types.ObjectId(),
        sender: userId,
        text: "My message",
      },
    ]),
  );
  const result = await getConversationMessages({
    userId,
    conversationId: threadId,
  });
  assert.equal(result.conversationClosed, true);
  assert.equal(result.messages[0].text, "My message");
});

test("removed message placeholders and redacted announcement creators remain valid records", async () => {
  await new Message({
    conversation: threadId,
    sender: null,
    removedAt: new Date(),
    text: "Message removed",
    idempotencyKey: "deleted:message",
  }).validate();
  await new SystemMessage({
    title: "Update",
    text: "App announcement",
    createdBy: null,
    creatorRemovedAt: new Date(),
    idempotencyKey: "deleted:announcement",
  }).validate();
});

test("season history uses completed seasons and the saved winner, without reconstructing contribution totals", async (t) => {
  const saved = [
    {
      _id: threadId,
      seasonNumber: 2,
      winningFaction: {
        name: "Winner",
        slug: "winner",
        colors: { primary: "#fff" },
      },
    },
  ];
  const seen = {};
  t.mock.method(Season, "find", (filter) => {
    assert.deepEqual(filter, { status: "completed" });
    const q = query(saved);
    q.populate = (field, selection) => {
      assert.equal(field, "winningFaction");
      assert.ok(selection.includes("colors"));
      return q;
    };
    q.skip = (value) => {
      seen.skip = value;
      return q;
    };
    q.limit = (value) => {
      seen.limit = value;
      return q;
    };
    return q;
  });
  t.mock.method(Season, "countDocuments", async () => 21);
  t.mock.method(SeasonContribution, "aggregate", () => {
    throw Error("Must not recalculate historical scores");
  });
  const result = await getSeasonHistory({ page: 2, limit: 10 });
  assert.deepEqual(result.seasons, saved);
  assert.equal(result.pagination.totalPages, 3);
  assert.deepEqual(seen, { skip: 10, limit: 10 });
});

test("support report cleanup targets existing arrays independently", async (t) => {
  const { writes } = await cleanupFixture(t);
  assert.equal(await processAccountDeletion({ userId }), true);
  const updates = writes.filter(
    (write) => write.model === "IssueReport" && write.args[2]?.arrayFilters,
  );
  assert.equal(updates.length, 2);
  const reports = [
    {},
    { history: [] },
    { replies: [] },
    { history: [{ admin: userId }] },
    { replies: [{ admin: userId }] },
    { history: [{ admin: otherId }], replies: [{ admin: otherId }] },
  ];
  for (const write of updates) {
    const [filter, update, options] = write.args;
    const field = Object.keys(filter)[0];
    assert.deepEqual(filter[field], { $elemMatch: { admin: userId } });
    assert.equal(Object.keys(update.$set).length, 1);
    assert.ok(Object.keys(update.$set)[0].startsWith(field + "."));
    assert.equal(options.arrayFilters.length, 1);
    const matched = reports.filter(
      (report) =>
        Array.isArray(report[field]) &&
        report[field].some((entry) => entry.admin === userId),
    );
    assert.equal(matched.length, 1);
    assert.ok(Array.isArray(matched[0][field]));
  }
});
