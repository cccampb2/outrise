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
import ActivityEvent from "../src/models/ActivityEvent.js";
import User from "../src/models/User.js";
import Exercise from "../src/models/Exercise.js";
import Verification from "../src/models/Verification.js";
import Friendship from "../src/models/Friendship.js";
import ActivityDismissal from "../src/models/ActivityDismissal.js";
import WorkoutOfTheWeekOccurrence from "../src/models/WorkoutOfTheWeekOccurrence.js";
import WorkoutSession from "../src/models/WorkoutSession.js";
import PersonalRecord from "../src/models/PersonalRecord.js";
import XPTransaction from "../src/models/XPtransaction.js";
import Achievement from "../src/models/Achievement.js";
import Season from "../src/models/Season.js";
import Faction from "../src/models/Faction.js";
import SeasonContribution from "../src/models/SeasonContribution.js";
import { addSeasonContribution } from "../src/services/seasonContribution.service.js";
import { completeActiveWorkoutSession } from "../src/services/workoutSession.service.js";
import {
  buildFactionSeasonEvents,
  recordSeasonWin,
} from "../src/services/factionActivity.service.js";
import { recordVerificationActivity } from "../src/services/verificationActivity.service.js";
import { rejectVerification } from "../src/services/verification.service.js";
import { reconcileWorkoutOfTheWeekOccurrences } from "../src/services/workoutOfTheWeek.service.js";
import {
  getActivityFeed,
  dismissActivityEvents,
  dismissAllActivityEvents,
  createActivityEvent,
} from "../src/services/activity.service.js";

const id = () => new mongoose.Types.ObjectId();
const actor = id(),
  factionId = id(),
  sourceId = id();
const factionDetails = { factionName: "Faction", seasonNumber: 1 };
const factionBase = {
  audience: "faction",
  faction: factionId,
  sourceType: "season",
  sourceId,
};

test("remaining event types validate and reject invalid audiences, owners, and sources", async () => {
  const events = [
    ...["verification_approved", "verification_rejected"].map((type) => ({
      type,
      actor,
      recipient: actor,
      audience: "personal",
      sourceType: "verification",
      sourceId,
      details: { actorUsername: "Caleb", exerciseName: "Bench" },
    })),
    {
      type: "workout_completed",
      actor,
      audience: "friends",
      sourceType: "workout_session",
      sourceId,
      details: { actorUsername: "Caleb", workoutName: "Push" },
    },
    {
      type: "wotw_launched",
      audience: "global",
      sourceType: "workout_of_the_week_occurrence",
      sourceId,
      details: { workoutName: "Challenge" },
    },
    {
      ...factionBase,
      type: "faction_rank_changed",
      details: { ...factionDetails, previousRank: 2, rank: 1 },
    },
    { ...factionBase, type: "faction_first_place", details: factionDetails },
    { ...factionBase, type: "faction_season_won", details: factionDetails },
    {
      ...factionBase,
      type: "faction_milestone",
      details: { ...factionDetails, milestone: 100000, totalXP: 100001 },
    },
  ];
  for (const [index, event] of events.entries()) {
    await new ActivityEvent({
      ...event,
      idempotencyKey: `test:${index}`,
    }).validate();
    await assert.rejects(() =>
      new ActivityEvent({
        ...event,
        idempotencyKey: "bad",
        sourceType: "friendship",
      }).validate(),
    );
  }
  await assert.rejects(() =>
    new ActivityEvent({
      ...events[0],
      recipient: id(),
      idempotencyKey: "bad",
    }).validate(),
  );
  await assert.rejects(() =>
    new ActivityEvent({
      ...events[3],
      actor,
      idempotencyKey: "bad",
    }).validate(),
  );
  await assert.rejects(() =>
    new ActivityEvent({
      ...events[4],
      faction: null,
      idempotencyKey: "bad",
    }).validate(),
  );
});

test("faction movement reports both directions and thresholds once, allowing later first-place returns", async () => {
  const a = id(),
    b = id();
  const season = { _id: id(), seasonNumber: 2, activityRevision: 1 };
  const before = [
    { id: a, name: "A", rank: 1, totalXP: 100000 },
    { id: b, name: "B", rank: 2, totalXP: 99999 },
  ];
  const after = [
    { id: b, name: "B", rank: 1, totalXP: 100001 },
    { id: a, name: "A", rank: 2, totalXP: 100000 },
  ];
  const events = buildFactionSeasonEvents({ season, before, after });
  assert.equal(
    events.filter((event) => event.type === "faction_rank_changed").length,
    2,
  );
  assert.equal(
    events.filter((event) => event.type === "faction_first_place").length,
    1,
  );
  assert.equal(
    events.filter((event) => event.type === "faction_milestone").length,
    1,
  );
  for (const event of events) await new ActivityEvent(event).validate();
  assert.deepEqual(
    buildFactionSeasonEvents({ season, before: after, after }),
    [],
  );
  const later = buildFactionSeasonEvents({
    season: { ...season, activityRevision: 3 },
    before,
    after,
  });
  assert.notEqual(events[0].idempotencyKey, later[0].idempotencyKey);
  assert.equal(
    events.find((event) => event.type === "faction_milestone").idempotencyKey,
    later.find((event) => event.type === "faction_milestone").idempotencyKey,
  );
});

test("verification decision events are private and use the review transaction", async (t) => {
  const session = { test: true };
  t.mock.method(User, "findById", () => ({
    select() {
      return this;
    },
    session: async () => ({ username: "Caleb" }),
  }));
  t.mock.method(Exercise, "findById", () => ({
    select() {
      return this;
    },
    session: async () => ({ name: "Bench" }),
  }));
  const captured = [];
  t.mock.method(
    ActivityEvent,
    "findOneAndUpdate",
    async (filter, update, options) => {
      assert.equal(options.session, session);
      captured.push(update.$setOnInsert);
      return update.$setOnInsert;
    },
  );
  for (const status of ["approved", "rejected"])
    await recordVerificationActivity(
      {
        _id: sourceId,
        user: actor,
        exercise: id(),
        status,
        reviewedAt: new Date(),
      },
      session,
    );
  assert.deepEqual(
    captured.map((event) => event.type),
    ["verification_approved", "verification_rejected"],
  );
  assert.ok(
    captured.every(
      (event) => event.audience === "personal" && event.recipient === actor,
    ),
  );
});

test("rejection saves its event with the decision and rejects repeated reviews", async (t) => {
  const session = {
    withTransaction: async (callback) => callback(),
    endSession: async () => {},
  };
  t.mock.method(mongoose, "startSession", async () => session);
  const verification = {
    _id: sourceId,
    user: actor,
    exercise: id(),
    status: "pending",
    save: async (options) => assert.equal(options.session, session),
  };
  t.mock.method(Verification, "findById", () => ({
    session: async () => verification,
  }));
  t.mock.method(User, "findById", () => ({
    select() {
      return this;
    },
    session: async () => ({ username: "Caleb" }),
  }));
  t.mock.method(Exercise, "findById", () => ({
    select() {
      return this;
    },
    session: async () => ({ name: "Bench" }),
  }));
  let count = 0;
  t.mock.method(ActivityEvent, "findOneAndUpdate", async () => {
    count++;
  });
  await rejectVerification({
    verificationId: sourceId,
    adminId: id(),
    rejectionReason: "Unclear proof",
  });
  assert.equal(verification.status, "rejected");
  assert.equal(count, 1);
  await assert.rejects(
    () => rejectVerification({ verificationId: sourceId, adminId: id() }),
    /Only pending/,
  );
});

test("WOTW reconciliation repairs a missing launch event for an already active occurrence", async (t) => {
  const occurrence = { _id: sourceId, name: "Challenge", startsAt: new Date() };
  t.mock.method(WorkoutOfTheWeekOccurrence, "updateMany", async () => {});
  t.mock.method(WorkoutOfTheWeekOccurrence, "findOne", (filter) =>
    filter.status === "upcoming"
      ? { sort: async () => null }
      : Promise.resolve(occurrence),
  );
  let event;
  t.mock.method(ActivityEvent, "findOneAndUpdate", async (filter, update) => {
    event = update.$setOnInsert;
  });
  await reconcileWorkoutOfTheWeekOccurrences();
  assert.equal(event.type, "wotw_launched");
  assert.equal(event.audience, "global");
  assert.equal(event.idempotencyKey, `wotw:${sourceId}:launched`);
});

test("feed and dismissal include only the viewer faction, global news, and existing private/friends audiences", async (t) => {
  t.mock.method(Friendship, "find", () => ({
    select() {
      return this;
    },
    lean: async () => [],
  }));
  t.mock.method(User, "find", () => ({ distinct: async () => [actor] }));
  t.mock.method(User, "findById", () => ({
    select() {
      return this;
    },
    lean: async () => ({ faction: factionId, accountStatus: "active" }),
  }));
  t.mock.method(ActivityDismissal, "find", () => ({
    distinct: async () => [],
  }));
  const filters = [];
  t.mock.method(ActivityEvent, "find", (filter) => {
    filters.push(filter);
    return {
      sort() {
        return this;
      },
      skip() {
        return this;
      },
      limit() {
        return this;
      },
      select() {
        return this;
      },
      lean: async () => [],
    };
  });
  t.mock.method(ActivityEvent, "countDocuments", async () => 0);
  await getActivityFeed({ userId: actor });
  assert.ok(
    filters[0].$or.some(
      (filter) => filter.audience === "faction" && filter.faction === factionId,
    ),
  );
  assert.ok(filters[0].$or.some((filter) => filter.audience === "global"));
  await assert.rejects(
    () =>
      dismissActivityEvents({ userId: actor, eventIds: [sourceId.toString()] }),
    /not found/,
  );
  assert.deepEqual(filters[1].$or, filters[0].$or);
});

test("clear all dismisses beyond a page or selection limit, preserves visibility, and is safe to retry", async (t) => {
  const friendId = id();
  const alreadyDismissed = id();
  const events = Array.from({ length: 503 }, () => ({ _id: id() }));
  const stored = new Map([
    [alreadyDismissed.toString(), { user: actor, event: alreadyDismissed }],
  ]);
  t.mock.method(Friendship, "find", () => ({
    select() {
      return this;
    },
    lean: async () => [{ requester: actor, recipient: friendId }],
  }));
  t.mock.method(User, "find", () => ({
    distinct: async () => [actor, friendId],
  }));
  t.mock.method(User, "findById", () => ({
    select() {
      return this;
    },
    lean: async () => ({ faction: factionId, accountStatus: "active" }),
  }));
  t.mock.method(ActivityDismissal, "find", (filter) => {
    assert.equal(filter.user, actor);
    return {
      distinct: async () =>
        [...stored.values()].map((dismissal) => dismissal.event),
    };
  });
  const filters = [];
  t.mock.method(ActivityEvent, "find", (filter) => {
    filters.push(filter);
    return {
      select() {
        return this;
      },
      lean() {
        return this;
      },
      cursor: async function* () {
        const excluded = new Set(filter._id.$nin.map(String));
        for (const event of events)
          if (!excluded.has(event._id.toString())) yield event;
      },
    };
  });
  const batchSizes = [];
  t.mock.method(ActivityDismissal, "bulkWrite", async (operations) => {
    batchSizes.push(operations.length);
    for (const { updateOne } of operations) {
      assert.equal(updateOne.filter.user, actor);
      assert.equal(updateOne.upsert, true);
      const dismissal = updateOne.update.$setOnInsert;
      assert.equal(dismissal.user, actor);
      assert.equal(dismissal.dismissedAt, filters[0].createdAt.$lte);
      stored.set(dismissal.event.toString(), dismissal);
    }
  });
  await dismissAllActivityEvents({ userId: actor });
  assert.equal(stored.size, 504);
  assert.deepEqual(batchSizes, [500, 3]);
  assert.deepEqual(filters[0].$or, [
    { recipient: actor, audience: "personal" },
    { actor: { $in: [actor, friendId] }, audience: "friends" },
    { audience: "global" },
    { audience: "faction", faction: factionId },
  ]);
  assert.ok(filters[0].createdAt.$lte instanceof Date);
  assert.deepEqual(filters[0]._id.$nin, [alreadyDismissed]);
  await dismissAllActivityEvents({ userId: actor });
  assert.equal(stored.size, 504);
  assert.deepEqual(batchSizes, [500, 3]);
});

test("system event retries use insert-only upserts with the same key", async (t) => {
  const event = {
    type: "wotw_launched",
    audience: "global",
    sourceType: "workout_of_the_week_occurrence",
    sourceId,
    details: { workoutName: "Challenge" },
    idempotencyKey: `wotw:${sourceId}:launched`,
  };
  let stored;
  t.mock.method(
    ActivityEvent,
    "findOneAndUpdate",
    async (filter, update, options) => {
      assert.equal(filter.idempotencyKey, event.idempotencyKey);
      assert.equal(options.upsert, true);
      stored ??= update.$setOnInsert;
      return stored;
    },
  );
  assert.equal(
    await createActivityEvent(event),
    await createActivityEvent({
      ...event,
      details: { workoutName: "Changed" },
    }),
  );
});

test("completion creates normal and qualifying WOTW events, including repeats, but excludes late or skipped WOTW", async (t) => {
  const session = {
    withTransaction: async (callback) => callback(),
    endSession: async () => {},
  };
  t.mock.method(mongoose, "startSession", async () => session);
  const query = (value) => ({
    select() {
      return this;
    },
    sort() {
      return this;
    },
    session: async () => value,
  });
  const exerciseId = id();
  let workout;
  let deadline;
  t.mock.method(WorkoutSession, "findOne", () => query(workout));
  t.mock.method(WorkoutSession, "find", () => query([]));
  t.mock.method(WorkoutSession, "countDocuments", () => query(1));
  t.mock.method(User, "findById", () =>
    query({ username: "Caleb", lifetimeXP: 0, totalWorkouts: 1 }),
  );
  t.mock.method(User, "findByIdAndUpdate", async () => ({
    username: "Caleb",
    lifetimeXP: 30,
  }));
  t.mock.method(PersonalRecord, "findOne", () => query({ value: 100 }));
  t.mock.method(Exercise, "find", () =>
    query([{ _id: exerciseId, baseXP: 5 }]),
  );
  t.mock.method(Achievement, "find", () => query([]));
  t.mock.method(XPTransaction, "aggregate", () => query([]));
  const xpSources = [];
  t.mock.method(XPTransaction.prototype, "save", async function () {
    xpSources.push(this.sourceType);
    return this;
  });
  t.mock.method(Season, "findOne", () => query(null));
  t.mock.method(WorkoutOfTheWeekOccurrence, "findById", () =>
    query({ _id: sourceId, name: "Challenge", bonusXP: 25, endsAt: deadline }),
  );
  const captured = [];
  t.mock.method(
    ActivityEvent,
    "findOneAndUpdate",
    async (filter, update, options) => {
      assert.equal(options.session, session);
      captured.push(update.$setOnInsert);
      return update.$setOnInsert;
    },
  );
  for (const scenario of ["normal", "original", "repeat", "late", "skipped"]) {
    captured.length = 0;
    xpSources.length = 0;
    deadline = new Date(Date.now() + (scenario === "late" ? -60000 : 60000));
    workout = {
      _id: id(),
      user: actor,
      status: "active",
      startedAt: new Date(Date.now() - 10000),
      workoutName: "Push",
      sourceType:
        scenario === "normal"
          ? "workout"
          : scenario === "original"
            ? "workout_of_the_week"
            : "repeat",
      workoutOfTheWeekOccurrence: scenario === "normal" ? null : sourceId,
      exercises: [
        {
          exercise: exerciseId,
          exerciseName: "Pushup",
          measurementType: "reps",
          skipped: scenario === "skipped",
          actual: { sets: [{ reps: 5 }] },
        },
      ],
      save: async () => {},
    };
    await completeActiveWorkoutSession({ userId: actor });
    if (scenario === "normal")
      assert.equal(captured[0].type, "workout_completed");
    else if (["original", "repeat"].includes(scenario)) {
      assert.equal(captured[0].type, "wotw_completed");
      assert.equal(
        captured[0].idempotencyKey,
        `user:${actor}:wotw:${sourceId}:completed`,
      );
    } else assert.equal(captured.length, 0);
    assert.equal(
      xpSources.includes("workout_of_the_week"),
      scenario === "original",
    );
  }
});

test("season contribution serializes the snapshot and emits changes in its transaction", async (t) => {
  const a = id(),
    b = id();
  const session = { test: true };
  const season = { _id: sourceId, seasonNumber: 3, activityRevision: 4 };
  const query = (value) => ({
    select() {
      return this;
    },
    session() {
      return this;
    },
    lean: async () => value,
    then(resolve) {
      return Promise.resolve(value).then(resolve);
    },
  });
  t.mock.method(Season, "findOne", () => query(season));
  t.mock.method(User, "findById", () =>
    query({ _id: actor, faction: b, accountStatus: "active" }),
  );
  let locked = false,
    contributed = false;
  t.mock.method(Season, "findOneAndUpdate", async (filter, update, options) => {
    assert.equal(update.$inc.activityRevision, 1);
    assert.equal(options.session, session);
    locked = true;
    return season;
  });
  t.mock.method(Faction, "find", () =>
    query([
      { _id: a, name: "A" },
      { _id: b, name: "B" },
    ]),
  );
  t.mock.method(SeasonContribution, "aggregate", () => {
    assert.equal(locked, true);
    return query([
      { _id: a, totalXP: 100000 },
      { _id: b, totalXP: contributed ? 100002 : 99999 },
    ]);
  });
  t.mock.method(
    SeasonContribution,
    "findOneAndUpdate",
    async (filter, update, options) => {
      assert.equal(options.session, session);
      assert.equal(update.$inc.xp, 3);
      contributed = true;
      return { faction: b, xp: 100002 };
    },
  );
  const events = [];
  t.mock.method(
    ActivityEvent,
    "findOneAndUpdate",
    async (filter, update, options) => {
      assert.equal(options.session, session);
      events.push(update.$setOnInsert);
    },
  );
  await addSeasonContribution({
    userId: actor,
    amount: 3,
    mongoSession: session,
  });
  assert.equal(
    events.filter((event) => event.type === "faction_rank_changed").length,
    2,
  );
  assert.ok(
    events.some(
      (event) => event.type === "faction_first_place" && event.faction === b,
    ),
  );
  assert.ok(
    events.some(
      (event) =>
        event.type === "faction_milestone" &&
        event.details.milestone === 100000,
    ),
  );
});

test("season winner event uses final winning faction and season end date", async (t) => {
  const session = { test: true };
  const endsAt = new Date();
  t.mock.method(Faction, "findById", () => ({
    select() {
      return this;
    },
    session: async () => ({ _id: factionId, name: "Winner" }),
  }));
  let event;
  t.mock.method(
    ActivityEvent,
    "findOneAndUpdate",
    async (filter, update, options) => {
      assert.equal(options.session, session);
      event = update.$setOnInsert;
    },
  );
  await recordSeasonWin(
    { _id: sourceId, winningFaction: factionId, seasonNumber: 5, endsAt },
    session,
  );
  assert.equal(event.type, "faction_season_won");
  assert.equal(event.faction, factionId);
  assert.equal(event.occurredAt, endsAt);
  event = null;
  await recordSeasonWin({ winningFaction: null }, session);
  assert.equal(event, null);
});
