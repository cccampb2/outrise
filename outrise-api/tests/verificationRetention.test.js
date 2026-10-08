import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import cron from "node-cron";
import Verification from "../src/models/Verification.js";
import cloudinary from "../src/config/cloudinary.js";
import { cleanupReviewedVerificationVideos } from "../src/services/verificationRetention.service.js";
import { startVerificationRetentionJob } from "../src/jobs/verificationRetention.job.js";
import { APP_TIME_ZONE } from "../src/config/app.js";

const mongooseUpdateOne = Verification.updateOne;
const now = new Date("2026-10-06T12:00:00Z");
const cutoff = new Date("2026-09-06T12:00:00Z");
function reviewed(overrides = {}) {
  return {
    _id: new mongoose.Types.ObjectId(),
    status: "approved",
    reviewedAt: cutoff,
    proofDeletedAt: null,
    proof: {
      type: "video",
      url: "https://example.test/video",
      publicId: "old-proof",
    },
    ...overrides,
  };
}
function fixture(t, rows) {
  const filters = [],
    writes = [],
    destroyed = [];
  t.mock.method(Verification, "find", (filter) => {
    filters.push(filter);
    return {
      sort() {
        return this;
      },
      select() {
        return this;
      },
      lean() {
        return this;
      },
      cursor(options) {
        assert.equal(options.batchSize, 100);
        return (async function* () {
          yield* rows;
        })();
      },
    };
  });
  t.mock.method(Verification, "updateOne", async (...args) => {
    writes.push(args);
    return { matchedCount: 1 };
  });
  t.mock.method(cloudinary.uploader, "destroy", async (id, options) => {
    destroyed.push({ id, options });
    return { result: "ok" };
  });
  return { filters, writes, destroyed };
}

test("reviewed videos expire at the 30-day boundary and cleanup only clears proof", async (t) => {
  const rows = [
    reviewed(),
    reviewed({
      status: "rejected",
      proof: { type: "video", url: "url", publicId: "rejected-proof" },
    }),
  ];
  const { filters, writes, destroyed } = fixture(t, rows);
  assert.deepEqual(await cleanupReviewedVerificationVideos({ now }), {
    deleted: 2,
    failed: 0,
    skipped: 0,
  });
  assert.deepEqual(filters[0].status.$in, ["approved", "rejected"]);
  assert.equal(filters[0].proofDeletedAt, null);
  assert.deepEqual(filters[0].reviewedAt, { $type: "date", $lte: cutoff });
  assert.deepEqual(
    destroyed.map((item) => item.id),
    ["old-proof", "rejected-proof"],
  );
  assert.ok(
    destroyed.every(
      (item) =>
        item.options.resource_type === "video" && item.options.invalidate,
    ),
  );
  for (const [filter, update, options] of writes) {
    assert.ok(filter._id);
    assert.ok(filter["proof.publicId"]);
    assert.deepEqual(Object.keys(update.$set).sort(), [
      "proof",
      "proofDeletedAt",
    ]);
    assert.equal(update.$set.proof, null);
    assert.ok(update.$set.proofDeletedAt instanceof Date);
    assert.equal(options.runValidators, true);
  }
});
test("pending, recent, already-cleaned and unreviewed submissions are preserved", async (t) => {
  const { writes, destroyed } = fixture(t, [
    reviewed({ status: "pending" }),
    reviewed({ reviewedAt: new Date(cutoff.getTime() + 1) }),
    reviewed({ proofDeletedAt: new Date() }),
    reviewed({ reviewedAt: null }),
    reviewed({ proof: null }),
  ]);
  assert.deepEqual(await cleanupReviewedVerificationVideos({ now }), {
    deleted: 0,
    failed: 0,
    skipped: 5,
  });
  assert.equal(writes.length, 0);
  assert.equal(destroyed.length, 0);
});
test("Cloudinary failures retain the proof reference and do not prevent other videos from cleaning up", async (t) => {
  const { writes } = fixture(t, [
    reviewed(),
    reviewed({ proof: { publicId: "next-video" } }),
  ]);
  t.mock.method(cloudinary.uploader, "destroy", async (id) => {
    if (id === "old-proof")
      throw Object.assign(new Error("Provider unavailable"), {
        http_code: 503,
      });
    return { result: "ok" };
  });
  assert.deepEqual(await cleanupReviewedVerificationVideos({ now }), {
    deleted: 1,
    failed: 1,
    skipped: 0,
  });
  assert.equal(writes.length, 1);
  assert.equal(writes[0][0]["proof.publicId"], "next-video");
});
test("unsuccessful Cloudinary results do not clear saved media", async (t) => {
  const { writes } = fixture(t, [reviewed()]);
  t.mock.method(cloudinary.uploader, "destroy", async () => ({
    result: "error",
  }));
  assert.equal((await cleanupReviewedVerificationVideos({ now })).failed, 1);
  assert.equal(writes.length, 0);
});
test("database failure after upload deletion can retry safely when Cloudinary returns not found", async (t) => {
  fixture(t, [reviewed()]);
  let attempts = 0,
    updates = 0;
  t.mock.method(cloudinary.uploader, "destroy", async () => ({
    result: ++attempts === 1 ? "ok" : "not found",
  }));
  t.mock.method(Verification, "updateOne", async () => {
    if (++updates === 1) throw new Error("Database unavailable");
    return { matchedCount: 1 };
  });
  assert.equal((await cleanupReviewedVerificationVideos({ now })).failed, 1);
  assert.equal((await cleanupReviewedVerificationVideos({ now })).deleted, 1);
});
test("concurrent account cleanup or changed proof is not overwritten", async (t) => {
  const { writes } = fixture(t, [reviewed()]);
  t.mock.method(Verification, "updateOne", async (filter, update) => {
    writes.push([filter, update]);
    return { matchedCount: 0 };
  });
  assert.deepEqual(await cleanupReviewedVerificationVideos({ now }), {
    deleted: 0,
    failed: 0,
    skipped: 1,
  });
  assert.equal(writes[0][0]["proof.publicId"], "old-proof");
  assert.deepEqual(writes[0][0].reviewedAt.$lte, cutoff);
});
test("schema requires video proof for pending submissions and permits reviewed records with a deletion date", async () => {
  const fields = {
    user: new mongoose.Types.ObjectId(),
    exercise: new mongoose.Types.ObjectId(),
    measurementType: "reps",
    performance: { reps: 20 },
  };
  await assert.rejects(
    new Verification({
      ...fields,
      status: "pending",
      proofDeletedAt: new Date(),
    }).validate(),
    (error) => !!error.errors.proof,
  );
  await assert.rejects(
    new Verification({ ...fields, status: "approved" }).validate(),
    (error) => !!error.errors.proof,
  );
  for (const status of ["approved", "rejected"])
    await new Verification({
      ...fields,
      status,
      proof: null,
      proofDeletedAt: new Date(),
      reviewedAt: cutoff,
    }).validate();
  await new Verification({ ...fields, proof: reviewed().proof }).validate();
});
test("job schedules daily cleanup, catches up on startup, and skips overlapping runs", async (t) => {
  let scheduled,
    reads = 0,
    release;
  const hold = new Promise((resolve) => {
    release = resolve;
  });
  const task = { stop() {} };
  t.mock.method(cron, "schedule", (expression, callback, options) => {
    assert.equal(expression, "0 3 * * *");
    assert.equal(options.timezone, APP_TIME_ZONE);
    scheduled = callback;
    return task;
  });
  t.mock.method(Verification, "find", () => {
    reads++;
    return {
      sort() {
        return this;
      },
      select() {
        return this;
      },
      lean() {
        return this;
      },
      cursor() {
        return (async function* () {
          await hold;
        })();
      },
    };
  });
  t.mock.method(Verification, "updateMany", async () => ({ modifiedCount: 0 }));
  assert.equal(startVerificationRetentionJob(), task);
  assert.equal(reads, 1);
  await scheduled();
  assert.equal(reads, 1);
  release();
  await new Promise((resolve) => setImmediate(resolve));
  await scheduled();
  assert.equal(reads, 4);
});
test("a failed scan does not prevent the next scheduled run", async (t) => {
  let scheduled,
    reads = 0;
  t.mock.method(cron, "schedule", (_expression, callback) => {
    scheduled = callback;
    return {};
  });
  t.mock.method(Verification, "find", () => {
    if (++reads === 1) throw new Error("Connection unavailable");
    return {
      sort() {
        return this;
      },
      select() {
        return this;
      },
      lean() {
        return this;
      },
      cursor() {
        return (async function* () {})();
      },
    };
  });
  t.mock.method(Verification, "updateMany", async () => ({ modifiedCount: 0 }));
  startVerificationRetentionJob();
  await new Promise((resolve) => setImmediate(resolve));
  await scheduled();
  assert.equal(reads, 3);
});

test("Mongoose update validation accepts proof removal only with its deletion marker", async () => {
  const update = mongooseUpdateOne.call(
    Verification,
    { status: "approved" },
    { $set: { proof: null, proofDeletedAt: new Date() } },
    { runValidators: true },
  );
  await update.validate(update.getUpdate(), update.getOptions(), false);
  const invalid = mongooseUpdateOne.call(
    Verification,
    {},
    { $set: { proof: null } },
    { runValidators: true },
  );
  await assert.rejects(
    invalid.validate(invalid.getUpdate(), invalid.getOptions(), false),
    (error) => !!error.errors.proof,
  );
});
