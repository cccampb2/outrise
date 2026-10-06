import test from "node:test";
import assert from "node:assert/strict";
import { Writable } from "node:stream";
import mongoose from "mongoose";
import User from "../src/models/User.js";
import Verification from "../src/models/Verification.js";
import Exercise from "../src/models/Exercise.js";
import cloudinary from "../src/config/cloudinary.js";
import { createVerification } from "../src/services/verification.service.js";
import { createVerificationSchema } from "../src/middleware/validators/verification.validators.js";

const id = () => new mongoose.Types.ObjectId();
function fixture(t) {
  const session = {
    withTransaction: (callback) => callback(),
    endSession: async () => {},
  };
  t.mock.method(mongoose, "startSession", async () => session);
  t.mock.method(User, "updateOne", async () => ({ matchedCount: 1 }));
  const records = new Map(),
    counters = { uploads: 0, deletes: 0, creates: 0 };
  const input = {
    userId: id(),
    exerciseId: id(),
    performance: { reps: 5 },
    proofFile: { buffer: Buffer.from("test video") },
    idempotencyKey: "verification:test-attempt",
  };
  const key = (filter) => `${filter.user}:${filter.idempotencyKey}`;
  t.mock.method(Verification, "findOne", (filter) => ({
    select: async () => records.get(key(filter)) ?? null,
  }));
  t.mock.method(Exercise, "findById", async () => ({
    _id: input.exerciseId,
    isActive: true,
    measurementType: "reps",
  }));
  t.mock.method(cloudinary.uploader, "upload_stream", (options, callback) => {
    counters.uploads++;
    const uploadNumber = counters.uploads;
    assert.equal(options.resource_type, "video");
    return new Writable({
      write(chunk, encoding, done) {
        done();
      },
      final(done) {
        callback(null, {
          secure_url: `https://example.test/video-${uploadNumber}`,
          public_id: `proof-${uploadNumber}`,
        });
        done();
      },
    });
  });
  t.mock.method(cloudinary.uploader, "destroy", async (publicId, options) => {
    counters.deletes++;
    assert.equal(options.resource_type, "video");
    return { result: "ok" };
  });
  t.mock.method(Verification, "create", async ([value]) => {
    counters.creates++;
    const record = { ...value, _id: id(), status: "pending" };
    records.set(key(value), record);
    return [record];
  });
  return { input, records, counters, key };
}

test("lost-response retries reuse the submitted verification without another upload", async (t) => {
  const f = fixture(t);
  const first = await createVerification(f.input);
  const second = await createVerification(f.input);
  assert.deepEqual(second, first);
  assert.deepEqual(f.counters, { uploads: 1, deletes: 0, creates: 1 });
  assert.equal(first.idempotencyKey, undefined);
  assert.equal(first.submissionFingerprint, undefined);
  assert.ok([...f.records.values()][0].submissionFingerprint);
});

test("reusing an attempt for changed performance, proof or exercise rejects it without uploads", async (t) => {
  const f = fixture(t);
  await createVerification(f.input);
  for (const change of [
    { performance: { reps: 6 } },
    { exerciseId: id() },
    { proofFile: { buffer: Buffer.from("different video") } },
  ])
    await assert.rejects(
      () => createVerification({ ...f.input, ...change }),
      /different proof or performance/,
    );
  assert.equal(f.counters.uploads, 1);
});

test("attempts are scoped to each user and a fresh attempt allows a new submission", async (t) => {
  const f = fixture(t);
  await createVerification(f.input);
  await createVerification({ ...f.input, userId: id() });
  await createVerification({
    ...f.input,
    idempotencyKey: "verification:next-attempt",
  });
  assert.equal(f.records.size, 3);
  assert.equal(f.counters.creates, 3);
});

test("a concurrent duplicate returns the winner and removes only the losing upload", async (t) => {
  const f = fixture(t);
  let winner;
  t.mock.method(Verification, "create", async ([value]) => {
    winner = {
      ...value,
      _id: id(),
      proof: {
        type: "video",
        url: "https://example.test/winner",
        publicId: "winner",
      },
    };
    f.records.set(f.key(value), winner);
    throw Object.assign(new Error("duplicate attempt"), { code: 11000 });
  });
  const result = await createVerification(f.input);
  assert.equal(result._id, winner._id);
  assert.equal(result.proof.publicId, "winner");
  assert.equal(f.counters.uploads, 1);
  assert.equal(f.counters.deletes, 1);
  assert.equal(
    cloudinary.uploader.destroy.mock.calls[0].arguments[0],
    "proof-1",
  );
});

test("a failed database save cleans up the new upload and preserves the error", async (t) => {
  const f = fixture(t);
  t.mock.method(Verification, "create", async () => {
    throw new Error("save unavailable");
  });
  await assert.rejects(() => createVerification(f.input), /save unavailable/);
  assert.equal(f.counters.deletes, 1);
});

test("attempt keys are bounded and uniquely indexed per user without affecting older documents", () => {
  const body = { exercise: String(id()), performance: { reps: 1 } };
  assert.equal(createVerificationSchema.body.validate(body).error, undefined);
  assert.equal(
    createVerificationSchema.body.validate({
      ...body,
      idempotencyKey: "verification:12345",
    }).error,
    undefined,
  );
  for (const invalid of ["x", "a".repeat(129), "attempt with spaces"])
    assert.ok(
      createVerificationSchema.body.validate({
        ...body,
        idempotencyKey: invalid,
      }).error,
    );
  const index = Verification.schema
    .indexes()
    .find(([fields]) => fields.user === 1 && fields.idempotencyKey === 1);
  assert.equal(index[1].unique, true);
  assert.deepEqual(index[1].partialFilterExpression, {
    idempotencyKey: { $type: "string" },
  });
});

test("an upload cannot attach after account deletion starts", async (t) => {
  const f = fixture(t);
  User.updateOne.mock.restore();
  t.mock.method(User, "updateOne", async () => ({ matchedCount: 0 }));
  await assert.rejects(
    () => createVerification(f.input),
    /account is no longer available/,
  );
  assert.equal(f.counters.creates, 0);
  assert.equal(f.counters.deletes, 1);
});
