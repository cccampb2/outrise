import ForbiddenError from "./ForbiddenError.js";

export default class AccountRestrictedError extends ForbiddenError {
  constructor(user) {
    const suspended = user.accountStatus === "suspended";
    super(suspended
      ? "Your account has been suspended for breaking ASCENDRA community rules."
      : "Your account has been banned indefinitely for breaking ASCENDRA community rules.");
    this.code = suspended ? "ACCOUNT_SUSPENDED" : "ACCOUNT_BANNED";
    this.accountStatus = user.accountStatus;
    this.suspendedUntil = suspended ? user.suspendedUntil ?? null : null;
  }
}
