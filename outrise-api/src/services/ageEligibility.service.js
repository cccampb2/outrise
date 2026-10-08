import User from "../models/User.js";
import BadRequestError from "../errors/BadRequestError.js";
import { ensureAccountAccess } from "./accountAccess.service.js";

export function validateAgeEligibility(age) {
  if (!Number.isInteger(age) || age < 0 || age > 120) {
    throw new BadRequestError("Enter a valid whole-number age.");
  }
  if (age < 18) {
    throw new BadRequestError(
      "Outrise beta is available to adults aged 18 or older.",
    );
  }
}

export async function confirmAgeEligibility({ userId, age }) {
  if (!Number.isInteger(age) || age < 0 || age > 120)
    throw new BadRequestError("Enter a valid whole-number age.");
  const account = await User.findById(userId);
  const user = await ensureAccountAccess(account);
  const result = (record) =>
    record.ageEligibilityRejectedAt
      ? {
          ageEligibilityConfirmedAt: null,
          ageEligibilityRejectedAt: record.ageEligibilityRejectedAt,
        }
      : { ageEligibilityConfirmedAt: record.ageEligibilityConfirmedAt };
  if (user.ageEligibilityRejectedAt) return result(user);
  if (age >= 18 && user.ageEligibilityConfirmedAt) return result(user);
  const rejected = age < 18;
  const updated = await User.findOneAndUpdate(
    {
      _id: userId,
      deletionRequestedAt: null,
      ageEligibilityRejectedAt: null,
      ...(!rejected ? { ageEligibilityConfirmedAt: null } : {}),
    },
    {
      $set: rejected
        ? {
            ageEligibilityRejectedAt: new Date(),
            ageEligibilityConfirmedAt: null,
          }
        : { ageEligibilityConfirmedAt: new Date() },
      $inc: { accountMutationRevision: 1 },
    },
    { returnDocument: "after", runValidators: true },
  ).select("ageEligibilityConfirmedAt ageEligibilityRejectedAt");
  const confirmed =
    updated ??
    (await User.findById(userId).select(
      "ageEligibilityConfirmedAt ageEligibilityRejectedAt",
    ));
  if (
    !confirmed ||
    (!confirmed.ageEligibilityConfirmedAt &&
      !confirmed.ageEligibilityRejectedAt)
  )
    throw new BadRequestError(
      "Unable to confirm age eligibility. Please try again.",
    );
  return result(confirmed);
}
