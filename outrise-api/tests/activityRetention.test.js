import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import cron from "node-cron";
import ActivityEvent from "../src/models/ActivityEvent.js";
import NotificationState from "../src/models/NotificationState.js";
import ActivityDismissal from "../src/models/ActivityDismissal.js";
import { cleanupExpiredActivity } from "../src/services/activityRetention.service.js";
import { startActivityRetentionJob } from "../src/jobs/activityRetention.job.js";
import { APP_TIME_ZONE } from "../src/config/app.js";
const now = new Date("2026-10-06T12:00:00Z"),
  cutoff = new Date("2026-07-08T12:00:00Z");
const id = () => new mongoose.Types.ObjectId();
const event = (occurredAt = cutoff) => ({ _id: id(), occurredAt });
function fixture(
  t,
  initialEvents = [],
  initialNotifications = [],
  initialDismissals = [],
) {
  const store = {
    events: [...initialEvents],
    notifications: [...initialNotifications],
    dismissals: [...initialDismissals],
  };
  const writes = [],
    limits = [];
  let ended = 0,
    transactions = 0;
  const session = {
    withTransaction: async (callback) => {
      transactions++;
      const snapshot = {
        events: [...store.events],
        notifications: [...store.notifications],
        dismissals: [...store.dismissals],
      };
      try {
        return await callback();
      } catch (error) {
        Object.assign(store, snapshot);
        throw error;
      }
    },
    endSession: async () => {
      ended++;
    },
  };
  t.mock.method(mongoose, "startSession", async () => session);
  t.mock.method(ActivityEvent, "find", (filter) => {
    assert.deepEqual(filter, { occurredAt: { $lte: cutoff } });
    let limit;
    return {
      sort() {
        return this;
      },
      limit(value) {
        limit = value;
        limits.push(value);
        return this;
      },
      select() {
        return this;
      },
      session(value) {
        assert.equal(value, session);
        return this;
      },
      lean: async () =>
        store.events.filter((row) => row.occurredAt <= cutoff).slice(0, limit),
    };
  });
  for (const [model, key] of [
    [ActivityEvent, "events"],
    [NotificationState, "notifications"],
    [ActivityDismissal, "dismissals"],
  ]) {
    t.mock.method(model, "deleteMany", async (filter, options) => {
      writes.push({ model: model.modelName, filter, options });
      const ids = filter.event?.$in ?? filter._id.$in;
      const matches = (row) =>
        ids.some(
          (value) =>
            String(value) === String(filter.event ? row.event : row._id),
        ) &&
        (!filter.occurredAt || row.occurredAt <= filter.occurredAt.$lte);
      const deletedCount = store[key].filter(matches).length;
      store[key] = store[key].filter((row) => !matches(row));
      return { deletedCount };
    });
    if (key !== "events")
      t.mock.method(model, "aggregate", (pipeline) => {
        assert.equal(pipeline[0].$lookup.from, ActivityEvent.collection.name);
        assert.equal(pipeline[0].$lookup.localField, "event");
        assert.deepEqual(pipeline[1].$match, {
          "retainedEvent.0": { $exists: false },
        });
        return {
          cursor(options) {
            assert.equal(options.batchSize, 200);
            return (async function* () {
              yield* store[key].filter(
                (row) =>
                  !store.events.some(
                    (item) => String(item._id) === String(row.event),
                  ),
              );
            })();
          },
        };
      });
  }
  return {
    store,
    writes,
    limits,
    session,
    stats: () => ({ ended, transactions }),
  };
}
test("90-day events and states are removed together while recent records remain", async (t) => {
  const old = event(),
    recent = event(new Date(cutoff.getTime() + 1));
  const f = fixture(
    t,
    [old, recent],
    [
      { _id: id(), event: old._id },
      { _id: id(), event: recent._id },
    ],
    [
      { _id: id(), event: old._id },
      { _id: id(), event: recent._id },
    ],
  );
  assert.deepEqual(await cleanupExpiredActivity({ now }), {
    eventsDeleted: 1,
    notificationStatesDeleted: 1,
    activityDismissalsDeleted: 1,
  });
  assert.deepEqual(f.store.events, [recent]);
  assert.equal(f.store.notifications[0].event, recent._id);
  assert.equal(f.store.dismissals[0].event, recent._id);
  assert.ok(f.writes.every((write) => write.options?.session === f.session));
  assert.equal(f.stats().ended, 1);
});
test("large histories are deleted in bounded batches", async (t) => {
  const f = fixture(
    t,
    Array.from({ length: 405 }, () => event()),
  );
  assert.equal((await cleanupExpiredActivity({ now })).eventsDeleted, 405);
  assert.ok(f.limits.every((value) => value === 200));
  assert.ok(
    f.writes
      .filter((write) => write.model === "ActivityEvent")
      .every((write) => write.filter._id.$in.length <= 200),
  );
  assert.equal(f.stats().transactions, 4);
});
test("failed cleanup rolls back its batch and can retry", async (t) => {
  const old = event();
  const f = fixture(
    t,
    [old],
    [{ _id: id(), event: old._id }],
    [{ _id: id(), event: old._id }],
  );
  const original = ActivityDismissal.deleteMany;
  let fail = true;
  t.mock.method(ActivityDismissal, "deleteMany", async (...args) => {
    if (fail) throw Error("Database unavailable");
    return original(...args);
  });
  await assert.rejects(cleanupExpiredActivity({ now }), /Database unavailable/);
  assert.equal(f.store.events.length, 1);
  assert.equal(f.store.notifications.length, 1);
  assert.equal(f.stats().ended, 1);
  fail = false;
  assert.equal((await cleanupExpiredActivity({ now })).eventsDeleted, 1);
});
test("orphan states are removed without touching retained events", async (t) => {
  const recent = event(now),
    missing = id();
  const f = fixture(
    t,
    [recent],
    [
      { _id: id(), event: missing },
      { _id: id(), event: recent._id },
    ],
    [
      { _id: id(), event: missing },
      { _id: id(), event: recent._id },
    ],
  );
  assert.deepEqual(await cleanupExpiredActivity({ now }), {
    eventsDeleted: 0,
    notificationStatesDeleted: 1,
    activityDismissalsDeleted: 1,
  });
  assert.equal(f.store.events.length, 1);
  assert.equal(f.store.notifications[0].event, recent._id);
  assert.equal(f.store.dismissals[0].event, recent._id);
});
test("rerunning successful cleanup is harmless", async (t) => {
  fixture(t, [event()]);
  assert.equal((await cleanupExpiredActivity({ now })).eventsDeleted, 1);
  assert.deepEqual(await cleanupExpiredActivity({ now }), {
    eventsDeleted: 0,
    notificationStatesDeleted: 0,
    activityDismissalsDeleted: 0,
  });
});
test("source workout, achievement, message and season history is untouched", async (t) => {
  fixture(t, [event()]);
  for (const name of [
    "WorkoutSession",
    "PersonalRecord",
    "UserAchievement",
    "Message",
    "SystemMessage",
    "Season",
  ]) {
    const model = (await import(`../src/models/${name}.js`)).default;
    t.mock.method(model, "deleteMany", () =>
      assert.fail("Source history must remain"),
    );
    t.mock.method(model, "updateMany", () =>
      assert.fail("Source history must remain"),
    );
  }
  assert.equal((await cleanupExpiredActivity({ now })).eventsDeleted, 1);
});
test("job schedules daily cleanup, catches failure and prevents overlapping runs", async (t) => {
  let scheduled,
    calls = 0,
    release;
  const hold = new Promise((resolve) => {
    release = resolve;
  });
  t.mock.method(cron, "schedule", (expression, callback, options) => {
    assert.equal(expression, "30 3 * * *");
    assert.equal(options.timezone, APP_TIME_ZONE);
    scheduled = callback;
    return {};
  });
  t.mock.method(mongoose, "startSession", async () => {
    calls++;
    await hold;
    throw new Error("Connection unavailable");
  });
  startActivityRetentionJob();
  assert.equal(calls, 1);
  await scheduled();
  assert.equal(calls, 1);
  release();
  await new Promise((resolve) => setImmediate(resolve));
  await scheduled();
  assert.equal(calls, 2);
});
