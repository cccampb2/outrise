import jwt from "jsonwebtoken";
import { hasCurrentLegalAcceptance } from "../services/legal.service.js";
import User from "../models/User.js";
import { ensureAccountAccess } from "../services/accountAccess.service.js";

export const socketAuth = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;

    if (typeof token !== "string" || !token) {
      throw new Error("Sign in to connect");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const account = await User.findById(decoded.userId).select(
      "role accountStatus suspendedUntil emailVerified legalAcceptance ageEligibilityConfirmedAt ageEligibilityRejectedAt deletionRequestedAt +tokenVersion",
    );
    if (
      account &&
      (decoded.tokenVersion ?? 0) !== (account.tokenVersion ?? 0)
    ) {
      throw new Error("Your session ended. Sign in again");
    }

    const user = await ensureAccountAccess(account);

    if (user.emailVerified !== true) {
      throw new Error("Verify your email before connecting");
    }

    if (!user.ageEligibilityConfirmedAt || user.ageEligibilityRejectedAt) {
      throw new Error("Confirm your age eligibility before connecting");
    }

    if (!hasCurrentLegalAcceptance(user))
      throw new Error("Read and accept the current Terms before connecting");
    socket.data.userId = user._id.toString();

    next();
  } catch (error) {
    const connectionError = new Error("Unable to connect");

    connectionError.data = {
      message:
        error.name === "JsonWebTokenError" || error.name === "TokenExpiredError"
          ? "Your session ended. Sign in again."
          : error.message,
    };
    next(connectionError);
  }
};
