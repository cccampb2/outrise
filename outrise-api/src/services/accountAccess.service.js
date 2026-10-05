import User from "../models/User.js";
import AccountRestrictedError from "../errors/AccountRestrictedError.js";
import UnauthorizedError from "../errors/UnauthorizedError.js";
import { canAccessAccount } from "../constants/accountStatus.js";

const restoreUpdate = {
  $set: { accountStatus: "active", suspendedUntil: null },
  $unset: { moderationReason: "", moderatedBy: "", moderatedAt: "" },
};

export const restoreExpiredSuspensions = async () => {
  await User.updateMany(
    {
      accountStatus: "suspended",
      suspendedUntil: { $ne: null, $lte: new Date() },
    },
    restoreUpdate,
  );
};

export const ensureAccountAccess = async (user) => {
  if (!user) {
    throw new UnauthorizedError("Account not found");
  }
  const now = new Date();
  if (
    user.accountStatus === "suspended" &&
    user.suspendedUntil &&
    user.suspendedUntil <= now
  ) {
    // The conditional update cannot overwrite a newer ban or extended suspension.
    const restored = await User.findOneAndUpdate(
      {
        _id: user._id,
        accountStatus: "suspended",
        suspendedUntil: { $ne: null, $lte: now },
      },
      restoreUpdate,
      { returnDocument: "after", runValidators: true },
    );
    user = restored ?? (await User.findById(user._id));
    if (!user) {
      throw new UnauthorizedError("Account not found");
    }
  }
  if (["suspended", "banned"].includes(user.accountStatus)) {
    throw new AccountRestrictedError(user);
  }
  if (!canAccessAccount(user.accountStatus)) {
    throw new UnauthorizedError("Account access unavailable");
  }
  return user;
};
