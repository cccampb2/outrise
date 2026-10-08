import { PENDING_VERIFICATION_RETENTION_DAYS } from "../config/verification.js";
import Verification from "../models/Verification.js";
import { deleteVerificationVideo } from "./media.service.js";
import logger from "../utils/logger.js";

export const VERIFICATION_VIDEO_RETENTION_DAYS = 30;
const REVIEWED_STATUSES = ["approved", "rejected"];

export async function cleanupReviewedVerificationVideos({
  now = new Date(),
} = {}) {
  const cutoff = new Date(
    now.getTime() - VERIFICATION_VIDEO_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  );
  const eligible = {
    status: { $in: REVIEWED_STATUSES },
    reviewedAt: { $type: "date", $lte: cutoff },
    proofDeletedAt: null,
    "proof.publicId": { $type: "string", $ne: "" },
  };
  const cursor = Verification.find(eligible)
    .sort({ reviewedAt: 1, _id: 1 })
    .select("_id status reviewedAt proof proofDeletedAt")
    .lean()
    .cursor({ batchSize: 100 });
  const result = { deleted: 0, failed: 0, skipped: 0 };
  for await (const verification of cursor) {
    if (
      !REVIEWED_STATUSES.includes(verification.status) ||
      !(verification.reviewedAt instanceof Date) ||
      verification.reviewedAt > cutoff ||
      verification.proofDeletedAt ||
      !verification.proof?.publicId
    ) {
      result.skipped++;
      continue;
    }
    let step = "delete Cloudinary verification video";
    try {
      await deleteVerificationVideo(verification.proof.publicId);
      step = "clear saved verification proof";
      const updated = await Verification.updateOne(
        {
          ...eligible,
          _id: verification._id,
          "proof.publicId": verification.proof.publicId,
        },
        { $set: { proof: null, proofDeletedAt: new Date() } },
        { runValidators: true },
      );
      // Account deletion or another worker may already have removed this record/media.
      if (updated.matchedCount === 1) result.deleted++;
      else result.skipped++;
    } catch (error) {
      result.failed++;
      // Keep the publicId for retry. Never log video URLs, identifiers, or documents.
      logger.warn(
        "Reviewed verification video cleanup will retry on the next run.",
        {
          step,
          errorType: error?.name ?? "Error",
          errorCode: typeof error?.code === "number" ? error.code : undefined,
          httpStatus: error?.http_code,
        },
      );
    }
  }
  return result;
}

// Change status before deleting media so an admin cannot approve deleted proof.
// Conditional writes also protect against a review or account deletion racing cleanup.
export async function cleanupPendingVerificationVideos({
  now = new Date(),
} = {}) {
  const cutoff = new Date(
    now.getTime() - PENDING_VERIFICATION_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  );
  const expired = await Verification.updateMany(
    { status: "pending", createdAt: { $type: "date", $lte: cutoff } },
    { $set: { status: "expired", expiredAt: now } },
    { runValidators: true },
  );
  const eligible = {
    status: "expired",
    proofDeletedAt: null,
    "proof.publicId": { $type: "string", $ne: "" },
  };
  const cursor = Verification.find(eligible)
    .sort({ expiredAt: 1, _id: 1 })
    .select("_id status proof proofDeletedAt")
    .lean()
    .cursor({ batchSize: 100 });
  const result = {
    expired: expired.modifiedCount,
    deleted: 0,
    failed: 0,
    skipped: 0,
  };
  for await (const verification of cursor) {
    if (
      verification.status !== "expired" ||
      verification.proofDeletedAt ||
      !verification.proof?.publicId
    ) {
      result.skipped++;
      continue;
    }
    let step = "delete Cloudinary expired verification video";
    try {
      await deleteVerificationVideo(verification.proof.publicId);
      step = "clear expired verification proof";
      const updated = await Verification.updateOne(
        {
          ...eligible,
          _id: verification._id,
          "proof.publicId": verification.proof.publicId,
        },
        { $set: { proof: null, proofDeletedAt: now } },
        { runValidators: true },
      );
      if (updated.matchedCount === 1) result.deleted++;
      else result.skipped++;
    } catch (error) {
      result.failed++;
      logger.warn(
        "Expired verification video cleanup will retry on the next run.",
        {
          step,
          errorType: error?.name ?? "Error",
          errorCode: typeof error?.code === "number" ? error.code : undefined,
          httpStatus: error?.http_code,
        },
      );
    }
  }
  return result;
}
