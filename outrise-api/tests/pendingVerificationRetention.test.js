import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import Verification from "../src/models/Verification.js";
import cloudinary from "../src/config/cloudinary.js";
import { cleanupPendingVerificationVideos } from "../src/services/verificationRetention.service.js";
import {
  pendingVerificationDeadline,
  isPendingVerificationOverdue,
} from "../src/config/verification.js";
import {
  approveVerification,
  rejectVerification,
} from "../src/services/verification.service.js";

const now = new Date("2026-10-07T12:00:00Z");
const cutoff = new Date("2026-09-07T12:00:00Z");
function fixture(t, rows) {
  const destroyed = [],
    writes = [],
    expiration = [];
  t.mock.method(Verification, "updateMany", async (...args) => {
    expiration.push(args);
    return { modifiedCount: 1 };
  });
  t.mock.method(Verification, "find", (filter) => {
    assert.ok(expiration.length >= 1, "expire before scanning media");
    assert.equal(filter.status, "expired");
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
          yield* rows;
        })();
      },
    };
  });
  t.mock.method(Verification, "updateOne", async (...args) => {
    writes.push(args);
    return { matchedCount: 1 };
  });
  t.mock.method(cloudinary.uploader, "destroy", async (id) => {
    destroyed.push(id);
    return { result: "ok" };
  });
  return { destroyed, writes, expiration };
}
const row = () => ({
  _id: new mongoose.Types.ObjectId(),
  status: "expired",
  proofDeletedAt: null,
  proof: { publicId: "expired-video" },
});

test("pending expiry includes the exact boundary and excludes fresh submissions", () => {
  assert.deepEqual(pendingVerificationDeadline(cutoff), now);
  assert.equal(
    isPendingVerificationOverdue({ status: "pending", createdAt: cutoff }, now),
    true,
  );
  assert.equal(
    isPendingVerificationOverdue(
      { status: "pending", createdAt: new Date(cutoff.getTime() + 1) },
      now,
    ),
    false,
  );
  assert.equal(
    isPendingVerificationOverdue(
      { status: "approved", createdAt: cutoff },
      now,
    ),
    false,
  );
  assert.equal(pendingVerificationDeadline("invalid"), null);
});

test("expiry claims only overdue pending submissions before removing video", async (t) => {
  const { expiration, writes, destroyed } = fixture(t, [row()]);
  assert.deepEqual(await cleanupPendingVerificationVideos({ now }), {
    expired: 1,
    deleted: 1,
    failed: 0,
    skipped: 0,
  });
  assert.deepEqual(expiration[0][0], {
    status: "pending",
    createdAt: { $type: "date", $lte: cutoff },
  });
  assert.deepEqual(expiration[0][1], {
    $set: { status: "expired", expiredAt: now },
  });
  assert.equal(expiration[0][2].runValidators, true);
  assert.deepEqual(destroyed, ["expired-video"]);
  assert.equal(writes[0][0].status, "expired");
  assert.equal(writes[0][0]["proof.publicId"], "expired-video");
  assert.deepEqual(writes[0][1], {
    $set: { proof: null, proofDeletedAt: now },
  });
});

test("failed video deletion keeps the media reference for the next run", async (t) => {
  const { writes } = fixture(t, [row()]);
  let attempts = 0;
  t.mock.method(cloudinary.uploader, "destroy", async () => {
    if (++attempts === 1) throw new Error("Unavailable");
    return { result: "not found" };
  });
  assert.equal((await cleanupPendingVerificationVideos({ now })).failed, 1);
  assert.equal(writes.length, 0);
  assert.equal((await cleanupPendingVerificationVideos({ now })).deleted, 1);
  assert.equal(writes.length, 1);
});

test("a review winning the expiry race preserves its proof", async (t) => {
  const { destroyed } = fixture(t, [
    { ...row(), status: "approved" },
    { ...row(), proofDeletedAt: now },
  ]);
  assert.equal((await cleanupPendingVerificationVideos({ now })).skipped, 2);
  assert.equal(destroyed.length, 0);
});

test("expired records retain submission identity and allow cleaned proof", async () => {
  const verification = new Verification({
    user: new mongoose.Types.ObjectId(),
    exercise: new mongoose.Types.ObjectId(),
    measurementType: "reps",
    performance: { reps: 20 },
    status: "expired",
    expiredAt: now,
    createdAt: cutoff,
    proof: null,
    proofDeletedAt: now,
  });
  await verification.validate();
  assert.deepEqual(verification.toJSON().pendingExpiresAt, now);
  assert.equal(verification.reviewedAt, null);
  assert.equal(verification.reviewedBy, null);
});

test("admins cannot review overdue pending submissions even before the job runs", async (t) => {
  let saves = 0;
  t.mock.method(mongoose, "startSession", async () => ({
    withTransaction: (callback) => callback(),
    endSession: async () => {},
  }));
  t.mock.method(Verification, "findById", () => ({
    session: async () => ({
      status: "pending",
      createdAt: new Date("2000-01-01"),
      save: async () => {
        saves++;
      },
    }),
  }));
  await assert.rejects(
    approveVerification({ verificationId: "id", adminId: "admin" }),
    /expired/,
  );
  await assert.rejects(
    rejectVerification({
      verificationId: "id",
      adminId: "admin",
      rejectionReason: "reason",
    }),
    /expired/,
  );
  assert.equal(saves, 0);
});
