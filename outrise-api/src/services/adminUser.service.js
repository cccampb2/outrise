import mongoose from "mongoose";
import { hasAdminAccess, USER_ROLES } from "../constants/userRoles.js";
import User from "../models/User.js";
import AccountModeration from "../models/AccountModeration.js";
import UserRoleChange from "../models/UserRoleChange.js";
import { ACCOUNT_STATUSES } from "../constants/accountStatus.js";
import BadRequestError from "../errors/BadRequestError.js";
import ForbiddenError from "../errors/ForbiddenError.js";
import NotFoundError from "../errors/NotFoundError.js";
import ConflictError from "../errors/ConflictError.js";

const adminUserFields =
  "username email role accountStatus suspendedUntil createdAt ageEligibilityRejectedAt +moderationReason +moderatedBy +moderatedAt";

export const listAdminUsers = async ({
  page = 1,
  limit = 20,
  search = "",
  status = "all",
}) => {
  const filter = {};
  if (status !== "all") {
    filter.accountStatus = status;
  }
  if (search) {
    const pattern = {
      $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      $options: "i",
    };
    filter.$or = [{ username: pattern }, { email: pattern }];
  }
  const [users, total] = await Promise.all([
    User.find(filter)
      .select(adminUserFields)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);
  return {
    users,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const getAdminUser = async (userId) => {
  const user = await User.findById(userId).select(adminUserFields).lean();
  if (!user) {
    throw new NotFoundError("User not found");
  }
  const history = await AccountModeration.find({ user: userId })
    .sort({ createdAt: -1, _id: -1 })
    .limit(30)
    .populate("admin", "username")
    .lean();
  const roleHistory = await UserRoleChange.find({ user: userId })
    .sort({ createdAt: -1, _id: -1 })
    .limit(30)
    .populate("owner", "username")
    .lean();
  return { user, history, roleHistory };
};

export const setUserRole = async ({
  userId,
  ownerId,
  role,
  expectedRole,
  reason,
}) => {
  if (
    !["user", "admin"].includes(role) ||
    !USER_ROLES.includes(expectedRole) ||
    typeof reason !== "string" ||
    !reason.trim() ||
    reason.trim().length > 1000
  ) {
    throw new BadRequestError(
      "Choose user or admin and provide an internal reason (up to 1,000 characters)",
    );
  }

  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(async () => {
      const owner = await User.findById(ownerId)
        .select("role")
        .session(session);
      if (owner?.role !== "owner") {
        throw new ForbiddenError("Only owners can change account roles");
      }
      const user = await User.findById(userId)
        .select(adminUserFields)
        .session(session);
      if (!user) {
        throw new NotFoundError("User not found");
      }
      if (user.role === "owner" || user._id.toString() === ownerId.toString()) {
        throw new ForbiddenError(
          "Owner accounts cannot have their roles changed here",
        );
      }
      if (user.role !== expectedRole) {
        throw new ConflictError(
          "This account's role has changed. Refresh and review it before trying again",
        );
      }
      if (user.role === role) {
        throw new BadRequestError("This account already has that role");
      }
      if (role === "admin" && user.accountStatus !== "active") {
        throw new BadRequestError(
          "Restore this account to active before promoting it to admin",
        );
      }

      const previousRole = user.role;
      user.role = role;
      await user.save({ session });
      await UserRoleChange.create(
        [
          {
            user: user._id,
            owner: ownerId,
            previousRole,
            role,
            reason: reason.trim(),
          },
        ],
        { session },
      );
      return user;
    });
  } finally {
    await session.endSession();
  }
};

export const setUserAccountStatus = async ({
  userId,
  adminId,
  status,
  reason,
  suspensionDays = 7,
}) => {
  if (
    !ACCOUNT_STATUSES.includes(status) ||
    typeof reason !== "string" ||
    !reason.trim() ||
    reason.trim().length > 1000
  ) {
    throw new BadRequestError(
      "Choose an account status and provide an admin-only reason (up to 1,000 characters)",
    );
  }
  if (
    status === "suspended" &&
    (!Number.isInteger(suspensionDays) ||
      suspensionDays < 1 ||
      suspensionDays > 365)
  ) {
    throw new BadRequestError(
      "Suspension length must be a whole number of days from 1 to 365",
    );
  }
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(async () => {
      const user = await User.findById(userId)
        .select(adminUserFields)
        .session(session);
      if (!user) {
        throw new NotFoundError("User not found");
      }
      if (
        status !== "active" &&
        (user._id.toString() === adminId.toString() ||
          hasAdminAccess(user.role))
      ) {
        throw new ForbiddenError(
          "Administrator and owner accounts cannot be flagged, suspended, or banned here",
        );
      }
      const now = new Date();
      const suspendedUntil =
        status === "suspended"
          ? new Date(now.getTime() + suspensionDays * 86400000)
          : null;
      const previousStatus = user.accountStatus;
      user.accountStatus = status;
      user.suspendedUntil = suspendedUntil;
      user.moderationReason = status === "active" ? undefined : reason.trim();
      user.moderatedBy = adminId;
      user.moderatedAt = now;
      await user.save({ session });
      await AccountModeration.create(
        [
          {
            user: user._id,
            admin: adminId,
            previousStatus,
            status,
            reason: reason.trim(),
            suspendedUntil,
          },
        ],
        { session },
      );
      return user;
    });
  } finally {
    await session.endSession();
  }
};

export async function clearAgeEligibilityRejection({
  userId,
  ownerId,
  reason,
}) {
  if (
    typeof reason !== "string" ||
    !reason.trim() ||
    reason.trim().length > 900
  )
    throw new BadRequestError(
      "Provide a review reason of up to 900 characters.",
    );
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(async () => {
      const owner = await User.findById(ownerId).session(session);
      if (!owner || owner.role !== "owner" || owner.deletionRequestedAt)
        throw new ForbiddenError("Owner access required");
      const user = await User.findOneAndUpdate(
        {
          _id: userId,
          ageEligibilityRejectedAt: { $ne: null },
          deletionRequestedAt: null,
        },
        {
          $set: {
            ageEligibilityRejectedAt: null,
            ageEligibilityConfirmedAt: null,
          },
          $inc: { accountMutationRevision: 1 },
        },
        { session, returnDocument: "after", runValidators: true },
      ).select(adminUserFields);
      if (!user)
        throw new ConflictError(
          "This account has no age restriction to clear, or is being deleted.",
        );
      await AccountModeration.create(
        [
          {
            user: user._id,
            admin: ownerId,
            previousStatus: user.accountStatus,
            status: user.accountStatus,
            reason: `Age eligibility rejection cleared after support review: ${reason.trim()}`,
            suspendedUntil: user.suspendedUntil,
          },
        ],
        { session },
      );
      return user;
    });
  } finally {
    await session.endSession();
  }
}
