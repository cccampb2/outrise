export const PENDING_VERIFICATION_RETENTION_DAYS = 30;

export function pendingVerificationDeadline(createdAt) {
  if (!createdAt) return null;
  const date = new Date(createdAt);
  if (!Number.isFinite(date.getTime())) return null;
  return new Date(
    date.getTime() + PENDING_VERIFICATION_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  );
}

export function isPendingVerificationOverdue(verification, now = new Date()) {
  const deadline = pendingVerificationDeadline(verification.createdAt);
  return (
    verification.status === "pending" && deadline !== null && deadline <= now
  );
}
