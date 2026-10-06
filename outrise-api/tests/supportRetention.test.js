import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import IssueReport from "../src/models/IssueReport.js";
import Suggestion from "../src/models/Suggestion.js";
import AccountModeration from "../src/models/AccountModeration.js";
import User from "../src/models/User.js";
import {
  cleanupSupportRecords,
  cleanupModerationRecords,
  supportRetentionCutoff,
} from "../src/services/supportRetention.service.js";
import { updateSuggestion } from "../src/services/suggestion.service.js";
const now = new Date("2028-02-29T12:00:00Z");

test("retention uses twelve calendar months, including leap years", () => {
  assert.equal(
    supportRetentionCutoff(now).toISOString(),
    "2027-02-28T12:00:00.000Z",
  );
});

test("support cleanup preserves open work and pending email delivery; legacy clocks start now", async (t) => {
  for (const [model, status, field] of [
    [IssueReport, "resolved", "resolvedAt"],
    [Suggestion, "closed", "closedAt"],
  ]) {
    t.mock.method(model, "updateMany", async (filter, update) => {
      assert.deepEqual(filter, { status, [field]: null });
      assert.equal(update.$set[field], now);
    });
    t.mock.method(model, "deleteMany", async (filter) => {
      assert.equal(filter.status, status);
      assert.equal(filter[field].$type, "date");
      assert.equal(
        filter[field].$lte.toISOString(),
        "2027-02-28T12:00:00.000Z",
      );
      if (model === IssueReport)
        assert.deepEqual(filter.replies, {
          $not: { $elemMatch: { status: "pending" } },
        });
      return { deletedCount: 2 };
    });
  }
  assert.deepEqual(await cleanupSupportRecords({ now }), {
    reportsDeleted: 2,
    suggestionsDeleted: 2,
  });
});

test("reopening a suggestion clears its retention clock", async (t) => {
  t.mock.method(Suggestion, "findOneAndUpdate", (filter, update) => {
    assert.equal(filter.revision, 4);
    assert.deepEqual(update.$set, { status: "planned", closedAt: null });
    return {
      populate() {
        return this;
      },
      lean: async () => ({ status: "planned" }),
    };
  });
  await updateSuggestion({
    suggestionId: new mongoose.Types.ObjectId(),
    status: "planned",
    expectedRevision: 4,
  });
});

function moderationMocks(t, matchedCount) {
  const userId = new mongoose.Types.ObjectId();
  t.mock.method(AccountModeration, "aggregate", () => ({
    cursor: () => ({
      async *[Symbol.asyncIterator]() {
        yield { _id: userId };
      },
    }),
  }));
  const session = {
    withTransaction: async (fn) => fn(),
    endSession: async () => {},
  };
  t.mock.method(mongoose, "startSession", async () => session);
  t.mock.method(User, "updateOne", async (filter, update, options) => {
    assert.deepEqual(filter, {
      _id: userId,
      accountStatus: "active",
      deletionRequestedAt: null,
    });
    assert.equal(update.$inc.accountMutationRevision, 1);
    assert.equal(options.session, session);
    return { matchedCount };
  });
  return { userId, session };
}

test("restricted and deleting users retain all moderation records", async (t) => {
  moderationMocks(t, 0);
  t.mock.method(AccountModeration, "updateMany", () =>
    assert.fail("must preserve records"),
  );
  t.mock.method(AccountModeration, "deleteMany", () =>
    assert.fail("must preserve records"),
  );
  assert.deepEqual(await cleanupModerationRecords({ now }), {
    moderationRecordsDeleted: 0,
  });
});

test("active users get a conservative resolution clock and old resolved history is removed transactionally", async (t) => {
  const { userId, session } = moderationMocks(t, 1);
  t.mock.method(
    AccountModeration,
    "updateMany",
    async (filter, update, options) => {
      assert.deepEqual(filter, { user: userId, resolvedAt: null });
      assert.equal(update.$set.resolvedAt, now);
      assert.equal(options.session, session);
    },
  );
  t.mock.method(AccountModeration, "deleteMany", async (filter, options) => {
    assert.equal(filter.user, userId);
    assert.equal(filter.resolvedAt.$type, "date");
    assert.equal(options.session, session);
    return { deletedCount: 3 };
  });
  assert.deepEqual(await cleanupModerationRecords({ now }), {
    moderationRecordsDeleted: 3,
  });
});

test("failed moderation cleanup closes its session and can be attempted again", async (t) => {
  const { session } = moderationMocks(t, 1);
  let ended = 0;
  session.endSession = async () => {
    ended++;
  };
  t.mock.method(AccountModeration, "updateMany", async () => {
    throw new Error("database unavailable");
  });
  await assert.rejects(
    cleanupModerationRecords({ now }),
    /database unavailable/,
  );
  assert.equal(ended, 1);
});
