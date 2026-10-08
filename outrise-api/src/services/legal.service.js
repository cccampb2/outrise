import User from "../models/User.js";
import { TERMS_VERSION, PRIVACY_VERSION } from "../config/legal.js";
import BadRequestError from "../errors/BadRequestError.js";
import ConflictError from "../errors/ConflictError.js";
import ForbiddenError from "../errors/ForbiddenError.js";
import { ensureAccountAccess } from "./accountAccess.service.js";
export function hasCurrentLegalAcceptance(user) {
  return Boolean(
    user?.legalAcceptance?.acceptedAt &&
    user.legalAcceptance.termsVersion === TERMS_VERSION &&
    user.legalAcceptance.privacyVersion === PRIVACY_VERSION,
  );
}
export function validateLegalAcceptance({
  accepted,
  termsVersion,
  privacyVersion,
}) {
  if (accepted !== true)
    throw new BadRequestError("Read and accept the Terms before continuing.");
  if (termsVersion !== TERMS_VERSION || privacyVersion !== PRIVACY_VERSION)
    throw new ConflictError(
      "The legal documents changed. Refresh and read the current versions before accepting.",
    );
}
export async function acceptLegalDocuments({ userId, ...input }) {
  validateLegalAcceptance(input);
  const user = await ensureAccountAccess(await User.findById(userId));
  if (!user.ageEligibilityConfirmedAt || user.ageEligibilityRejectedAt)
    throw new ForbiddenError("Confirm your age eligibility before accepting.");
  if (hasCurrentLegalAcceptance(user)) return user.legalAcceptance;
  const acceptance = {
    acceptedAt: new Date(),
    termsVersion: TERMS_VERSION,
    privacyVersion: PRIVACY_VERSION,
  };
  const updated = await User.findOneAndUpdate(
    {
      _id: userId,
      deletionRequestedAt: null,
      ageEligibilityConfirmedAt: { $ne: null },
      ageEligibilityRejectedAt: null,
      $or: [
        { "legalAcceptance.acceptedAt": null },
        { "legalAcceptance.termsVersion": { $ne: TERMS_VERSION } },
        { "legalAcceptance.privacyVersion": { $ne: PRIVACY_VERSION } },
      ],
    },
    {
      $set: { legalAcceptance: acceptance },
      $inc: { accountMutationRevision: 1 },
    },
    { returnDocument: "after", runValidators: true },
  ).select("legalAcceptance");
  const confirmed =
    updated ?? (await User.findById(userId).select("legalAcceptance"));
  if (!hasCurrentLegalAcceptance(confirmed))
    throw new ConflictError(
      "Unable to save acceptance. Refresh your account and try again.",
    );
  return confirmed.legalAcceptance;
}
