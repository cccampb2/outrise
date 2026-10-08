import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import Message from "../src/models/Message.js";
import Conversation from "../src/models/Conversation.js";
import User from "../src/models/User.js";
import IssueReport from "../src/models/IssueReport.js";
import { reportMessage } from "../src/services/messageReport.service.js";
import {
  reportMessageSchema,
  createIssueReportSchema,
} from "../src/middleware/validators/issueReport.validators.js";
const id = () => new mongoose.Types.ObjectId();
const query = (value) => ({
  select() {
    return this;
  },
  session() {
    return this;
  },
  lean: async () => value,
});
function setup(
  t,
  { participant = true, self = false, removed = false, users = 2 } = {},
) {
  const reporter = id(),
    sender = self ? reporter : id(),
    messageId = id(),
    conversation = id();
  let ended = false,
    created;
  t.mock.method(mongoose, "startSession", async () => ({
    withTransaction: async (fn) => fn(),
    endSession: async () => {
      ended = true;
    },
  }));
  t.mock.method(Message, "findById", () =>
    query({
      _id: messageId,
      sender,
      conversation,
      text: "Database original text",
      createdAt: new Date("2026-10-06T12:00:00Z"),
      removedAt: removed ? new Date() : null,
    }),
  );
  t.mock.method(Conversation, "findOne", (filter) => {
    assert.deepEqual(filter.$or, [
      { userLow: reporter },
      { userHigh: reporter },
    ]);
    return query(participant ? { _id: conversation } : null);
  });
  t.mock.method(User, "updateMany", async (filter, update) => {
    assert.equal(filter.deletionRequestedAt, null);
    assert.equal(update.$inc.accountMutationRevision, 1);
    return { matchedCount: users };
  });
  t.mock.method(User, "findById", () =>
    query({ email: "reporter@example.com" }),
  );
  t.mock.method(IssueReport, "create", async ([data]) => {
    created = data;
    return [data];
  });
  return {
    reporter,
    sender,
    messageId,
    conversation,
    get created() {
      return created;
    },
    get ended() {
      return ended;
    },
  };
}
test("message reports copy database evidence and authenticated identity, ignoring supplied snapshots", async (t) => {
  const f = setup(t);
  const report = await reportMessage({
    userId: f.reporter,
    messageId: f.messageId,
    reason: "This is harassment",
    text: "Forged",
    email: "fake@example.com",
    reportedUserId: id(),
  });
  assert.equal(report.email, "reporter@example.com");
  assert.equal(report.reporter, f.reporter);
  assert.equal(report.reportedUser, f.sender);
  assert.equal(report.reportedMessage.text, "Database original text");
  assert.equal(report.reportedMessage.messageId, f.messageId);
  assert.equal(report.reportedMessage.conversation, f.conversation);
  assert.ok(f.ended);
  await new IssueReport(report).validate();
});
for (const [name, options, status] of [
  ["outsiders", { participant: false }, 404],
  ["own messages", { self: true }, 400],
  ["removed messages", { removed: true }, 404],
  ["deleting accounts", { users: 1 }, 404],
]) {
  test(`rejects ${name} without creating a report`, async (t) => {
    const f = setup(t, options);
    await assert.rejects(
      reportMessage({
        userId: f.reporter,
        messageId: f.messageId,
        reason: "Concern about this message",
      }),
      (error) => error.statusCode === status,
    );
    assert.equal(f.created, undefined);
    assert.ok(f.ended);
  });
}
test("message report validation accepts only reason and rejects client-supplied evidence", () => {
  assert.ok(
    !reportMessageSchema.body.validate({ reason: "This is harassment" }).error,
  );
  for (const extra of [
    { email: "fake@example.com" },
    { text: "fake" },
    { reportedUserId: String(id()) },
  ])
    assert.ok(
      reportMessageSchema.body.validate({
        reason: "This is harassment",
        ...extra,
      }).error,
    );
  assert.ok(
    createIssueReportSchema.body.validate({
      email: "a@example.com",
      subject: "Report",
      message: "Long enough reason",
      reportedMessage: { text: "fake" },
    }).error,
  );
});
