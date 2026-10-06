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
  validateAgeEligibility(age);
  const account = await User.findById(userId);
  const user = await ensureAccountAccess(account);
  if (user.ageEligibilityConfirmedAt) {
    return { ageEligibilityConfirmedAt: user.ageEligibilityConfirmedAt };
  }
  // Conditional write preserves the original confirmation date on retries.
  const updated = await User.findOneAndUpdate(
    { _id: userId, ageEligibilityConfirmedAt: null },
    { $set: { ageEligibilityConfirmedAt: new Date() } },
    { returnDocument: "after", runValidators: true },
  ).select("ageEligibilityConfirmedAt");
  const confirmed =
    updated ??
    (await User.findById(userId).select("ageEligibilityConfirmedAt"));
  if (!confirmed?.ageEligibilityConfirmedAt) {
    throw new BadRequestError(
      "Unable to confirm age eligibility. Please try again.",
    );
  }
  return { ageEligibilityConfirmedAt: confirmed.ageEligibilityConfirmedAt };
}
