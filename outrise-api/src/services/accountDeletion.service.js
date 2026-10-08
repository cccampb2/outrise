import UserBlock from "../models/UserBlock.js";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { randomUUID } from "node:crypto";
import User from "../models/User.js";
import AccountDeletion from "../models/AccountDeletion.js";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import Friendship from "../models/Friendship.js";
import Workout from "../models/Workout.js";
import WorkoutSession from "../models/WorkoutSession.js";
import Verification from "../models/Verification.js";
import PersonalRecord from "../models/PersonalRecord.js";
import UserAchievement from "../models/UserAchievement.js";
import XPtransaction from "../models/XPtransaction.js";
import SeasonContribution from "../models/SeasonContribution.js";
import ActivityEvent from "../models/ActivityEvent.js";
import ActivityDismissal from "../models/ActivityDismissal.js";
import NotificationState from "../models/NotificationState.js";
import Suggestion from "../models/Suggestion.js";
import IssueReport from "../models/IssueReport.js";
import AccountModeration from "../models/AccountModeration.js";
import UserRoleChange from "../models/UserRoleChange.js";
import WorkoutOfTheWeek from "../models/WorkoutOfTheWeek.js";
import WorkoutOfTheWeekOccurrence from "../models/WorkoutOfTheWeekOccurrence.js";
import SystemMessage from "../models/SystemMessage.js";
import cloudinary from "../config/cloudinary.js";
import UnauthorizedError from "../errors/UnauthorizedError.js";
import ConflictError from "../errors/ConflictError.js";
import logger from "../utils/logger.js";

export async function requestAccountDeletion({ userId, password }) {
  const user = await User.findById(userId).select("+password +tokenVersion");
  if (
    !user ||
    typeof password !== "string" ||
    !(await bcrypt.compare(password, user.password))
  ) {
    throw new UnauthorizedError("Password is incorrect.");
  }
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const current = await User.findById(userId)
        .select("+tokenVersion")
        .session(session);
      if (
        !current ||
        (current.tokenVersion ?? 0) !== (user.tokenVersion ?? 0)
      ) {
        throw new UnauthorizedError(
          "Your session changed. Sign in again before deleting your account.",
        );
      }
      if (current.role === "owner") {
        const otherOwner = await User.findOne({
          _id: { $ne: current._id },
          role: "owner",
          accountStatus: { $in: ["active", "flagged"] },
          deletionRequestedAt: null,
        }).session(session);
        if (!otherOwner)
          throw new ConflictError(
            "The last owner cannot delete their account. Assign another owner first.",
          );
        const locked = await User.updateOne(
          { _id: otherOwner._id, role: "owner", deletionRequestedAt: null },
          { $inc: { accountMutationRevision: 1 } },
          { session },
        );
        if (locked.matchedCount !== 1)
          throw new ConflictError("Owner access changed. Please try again.");
      }
      const existing = await AccountDeletion.findOne({ user: userId }).session(
        session,
      );
      if (!existing) {
        const verifications = await Verification.find({ user: userId })
          .select("proof")
          .session(session)
          .lean();
        const assets = [];
        if (current.profileImage?.publicId)
          assets.push({
            publicId: current.profileImage.publicId,
            resourceType: "image",
          });
        for (const item of verifications)
          if (item.proof?.publicId)
            assets.push({
              publicId: item.proof.publicId,
              resourceType: "video",
            });
        const uniqueAssets = [
          ...new Map(
            assets.map((asset) => [
              `${asset.resourceType}:${asset.publicId}`,
              asset,
            ]),
          ).values(),
        ];
        await AccountDeletion.create([{ user: userId, assets: uniqueAssets }], {
          session,
        });
      }
      await User.updateOne(
        { _id: userId },
        {
          $set: {
            deletionRequestedAt: current.deletionRequestedAt ?? new Date(),
            accountStatus: "banned",
          },
          $inc: { tokenVersion: 1 },
        },
        { session },
      );
      await Conversation.updateMany(
        { $or: [{ userLow: userId }, { userHigh: userId }], closedAt: null },
        { $set: { closedAt: new Date() } },
        { session },
      );
    });
    return {
      status: "pending",
      message: "Your account is disabled and deletion has been requested.",
    };
  } finally {
    await session.endSession();
  }
}

async function removeAccountRecords(job, session, setStep) {
  const userId = job.user;
  const user = await User.findById(userId).session(session);
  const eventIds = await ActivityEvent.find({
    $or: [{ actor: userId }, { recipient: userId }],
  })
    .distinct("_id")
    .session(session);
  setStep("ActivityDismissal.deleteMany");
  await ActivityDismissal.deleteMany(
    { $or: [{ user: userId }, { event: { $in: eventIds } }] },
    { session },
  );
  setStep("NotificationState.deleteMany");
  await NotificationState.deleteMany(
    { $or: [{ user: userId }, { event: { $in: eventIds } }] },
    { session },
  );
  setStep("ActivityEvent.deleteMany");
  await ActivityEvent.deleteMany({ _id: { $in: eventIds } }, { session });
  setStep("Friendship.deleteMany");
  await Friendship.deleteMany(
    {
      $or: [
        { requester: userId },
        { recipient: userId },
        { userLow: userId },
        { userHigh: userId },
      ],
    },
    { session },
  );
  setStep("UserBlock.deleteMany");
  await UserBlock.deleteMany(
    { $or: [{ blocker: userId }, { blocked: userId }] },
    { session },
  );
  // Keep the other participant's history. These rows contain no original message text.
  setStep("Message.updateMany");
  await Message.updateMany(
    { sender: userId },
    [
      {
        $set: {
          text: "Message removed",
          sender: null,
          removedAt: new Date(),
          readBy: [],
          idempotencyKey: { $concat: ["deleted:", { $toString: "$_id" }] },
        },
      },
    ],
    { session, updatePipeline: true },
  );
  setStep("Message.updateMany");
  await Message.updateMany(
    { readBy: userId },
    { $pull: { readBy: userId } },
    { session },
  );
  setStep("Conversation.updateMany");
  await Conversation.updateMany(
    { $or: [{ userLow: userId }, { userHigh: userId }] },
    { $set: { closedAt: new Date() } },
    { session },
  );
  // Delete empty/orphaned threads once neither participant has an account.
  const threads = await Conversation.find({
    $or: [{ userLow: userId }, { userHigh: userId }],
  })
    .session(session)
    .lean();
  for (const thread of threads) {
    const otherId =
      thread.userLow.toString() === userId.toString()
        ? thread.userHigh
        : thread.userLow;
    const other = await User.exists({ _id: otherId }).session(session);
    if (!other) {
      setStep("Message.deleteMany");
      await Message.deleteMany({ conversation: thread._id }, { session });
      setStep("Conversation.deleteOne");
      await Conversation.deleteOne({ _id: thread._id }, { session });
    }
  }
  for (const model of [
    WorkoutSession,
    Verification,
    PersonalRecord,
    UserAchievement,
    XPtransaction,
    SeasonContribution,
    Suggestion,
    AccountModeration,
    UserRoleChange,
  ]) {
    setStep(`remove ${model.modelName} records`);
    await model.deleteMany({ user: userId }, { session });
  }
  setStep("Workout.deleteMany");
  await Workout.deleteMany({ owner: userId }, { session });
  // Support records contain copied addresses and free text, not only User references.
  const reportFilter = [{ reportedUser: userId }, { reporter: userId }];
  if (user?.email)
    reportFilter.push({ email: user.email }, { "replies.to": user.email });
  setStep("IssueReport.deleteMany");
  await IssueReport.deleteMany({ $or: reportFilter }, { session });
  setStep("Verification.updateMany");
  await Verification.updateMany(
    { reviewedBy: userId },
    { $set: { reviewedBy: null } },
    { session },
  );
  setStep("User.updateMany");
  await User.updateMany(
    { moderatedBy: userId },
    { $unset: { moderatedBy: "" } },
    { session },
  );
  setStep("AccountModeration.updateMany");
  await AccountModeration.updateMany(
    { admin: userId },
    { $set: { admin: null } },
    { session },
  );
  setStep("UserRoleChange.updateMany");
  await UserRoleChange.updateMany(
    { owner: userId },
    { $set: { owner: null } },
    { session },
  );
  // Older reports can lack either array. Match each array independently.
  setStep("remove support report history staff references");
  await IssueReport.updateMany(
    { history: { $elemMatch: { admin: userId } } },
    { $set: { "history.$[entry].admin": null } },
    { session, arrayFilters: [{ "entry.admin": userId }] },
  );
  setStep("remove support report reply staff references");
  await IssueReport.updateMany(
    { replies: { $elemMatch: { admin: userId } } },
    { $set: { "replies.$[reply].admin": null } },
    { session, arrayFilters: [{ "reply.admin": userId }] },
  );
  setStep("IssueReport.updateMany");
  await IssueReport.updateMany(
    { reviewer: userId },
    { $set: { reviewer: null } },
    { session },
  );
  setStep("IssueReport.updateMany");
  await IssueReport.updateMany(
    { resolvedBy: userId },
    { $set: { resolvedBy: null } },
    { session },
  );
  setStep("WorkoutOfTheWeek.updateMany");
  await WorkoutOfTheWeek.updateMany(
    { createdBy: userId },
    { $set: { createdBy: null } },
    { session },
  );
  setStep("WorkoutOfTheWeekOccurrence.updateMany");
  await WorkoutOfTheWeekOccurrence.updateMany(
    { selectedBy: userId },
    { $set: { selectedBy: null } },
    { session },
  );
  // Published announcements belong to Outrise. Replace potentially identifying retry keys.
  setStep("SystemMessage.updateMany");
  await SystemMessage.updateMany(
    { createdBy: userId },
    [
      {
        $set: {
          createdBy: null,
          creatorRemovedAt: new Date(),
          idempotencyKey: { $concat: ["deleted:", { $toString: "$_id" }] },
        },
      },
    ],
    { session, updatePipeline: true },
  );
  setStep("User.deleteOne");
  await User.deleteOne({ _id: userId }, { session });
  // Remove the task, including its user identifier and asset list, after successful cleanup.
  const finished = await AccountDeletion.deleteOne(
    { _id: job._id, leaseToken: job.leaseToken, assets: job.assets },
    { session },
  );
  if (finished.deletedCount !== 1)
    throw new Error("Deletion task ownership changed.");
}

export async function processAccountDeletion({ userId, io } = {}) {
  const leaseToken = randomUUID();
  const now = new Date();
  const job = await AccountDeletion.findOneAndUpdate(
    {
      ...(userId ? { user: userId } : {}),
      nextAttemptAt: { $lte: now },
      $or: [{ leaseUntil: null }, { leaseUntil: { $lte: now } }],
    },
    {
      $set: { leaseUntil: new Date(now.getTime() + 120000), leaseToken },
      $inc: { attempts: 1 },
    },
    { returnDocument: "after" },
  );
  if (!job) return false;
  let step = "start cleanup";
  try {
    for (const asset of job.assets) {
      // Renew the claim while cleaning a potentially large set of uploads.
      step = "renew upload cleanup claim";
      const renewed = await AccountDeletion.updateOne(
        { _id: job._id, leaseToken },
        { $set: { leaseUntil: new Date(Date.now() + 120000) } },
      );
      if (renewed.matchedCount !== 1)
        throw new Error("Deletion task ownership changed.");
      step = `delete Cloudinary ${asset.resourceType}`;
      const result = await cloudinary.uploader.destroy(asset.publicId, {
        resource_type: asset.resourceType,
        invalidate: true,
      });
      if (!["ok", "not found"].includes(result?.result))
        throw new Error("Uploaded file cleanup failed.");
    }
    step = "start database cleanup transaction";
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(() =>
        removeAccountRecords(job, session, (value) => {
          step = value;
        }),
      );
    } finally {
      await session.endSession();
    }
    io?.emit("accounts:updated");
    return true;
  } catch (error) {
    // Keep the failure useful without logging documents or uploaded file identifiers.
    let reason = String(error?.message ?? "Unknown cleanup error");
    for (const asset of job.assets)
      reason = reason.split(asset.publicId).join("[asset]");
    reason = reason
      .replace(/https?:\/\/\S+/g, "[URL]")
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
      .replace(/\b[a-f0-9]{24}\b/gi, "[ID]")
      .replace(/"[^"\n]*"|'[^'\n]*'/g, "[value]")
      .slice(0, 600);
    logger.warn("Account deletion will retry after an incomplete cleanup.", {
      step,
      attempt: job.attempts,
      errorType: error?.name ?? "Error",
      errorCode: typeof error?.code === "number" ? error.code : undefined,
      httpStatus: error?.http_code,
      reason,
    });
    await AccountDeletion.updateOne(
      { _id: job._id, leaseToken },
      {
        $set: {
          leaseUntil: null,
          leaseToken: null,
          nextAttemptAt: new Date(Date.now() + 60000),
        },
      },
    );
    return false;
  }
}

// An upload rejected during deletion may itself fail to clean up. Preserve it
// in the durable task, even if the original account cleanup already completed.
export async function queueDeletingAccountUpload({
  userId,
  publicId,
  resourceType,
}) {
  const user = await User.findById(userId).select("deletionRequestedAt");
  if (user && !user.deletionRequestedAt) return;
  await AccountDeletion.updateOne(
    { user: userId },
    {
      $addToSet: { assets: { publicId, resourceType } },
      $set: { nextAttemptAt: new Date() },
      $setOnInsert: { user: userId },
    },
    { upsert: true },
  );
}
