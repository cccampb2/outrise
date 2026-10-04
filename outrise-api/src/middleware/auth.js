import jwt from "jsonwebtoken";
import UnauthorizedError from "../errors/UnauthorizedError.js";
import ForbiddenError from "../errors/ForbiddenError.js";
import User from "../models/User.js";
import { ensureAccountAccess } from "../services/accountAccess.service.js";

const createAuthentication = ({ allowUnverified = false } = {}) => async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedError("Authentication required");
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const account = await User.findById(decoded.userId)
      .select("role accountStatus suspendedUntil emailVerified +tokenVersion");
    // Legacy tokens/documents count as version zero until the first reset.
    if (account && (decoded.tokenVersion ?? 0) !== (account.tokenVersion ?? 0)) {
      const error = new UnauthorizedError("Your session ended. Sign in again.");
      error.code = "SESSION_EXPIRED";
      throw error;
    }
    const user = await ensureAccountAccess(account);
    // Use the current database role, rather than a potentially stale token role.
    const emailVerified = user.emailVerified === true;
    req.user = { ...decoded, userId: user._id.toString(), role: user.role, emailVerified };
    if (!allowUnverified && !emailVerified) {
      const error = new ForbiddenError("Verify your email before continuing.");
      error.code = "EMAIL_VERIFICATION_REQUIRED";
      throw error;
    }

    next();
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      const sessionError = new UnauthorizedError("Your session ended. Sign in again.");
      sessionError.code = "SESSION_EXPIRED";
      return next(sessionError);
    }
    next(error);
  }
};

// App endpoints require verification. Only account status and code endpoints
// explicitly opt into the identity-only middleware, while retaining moderation
// and token-revocation checks.
export const authenticate = createAuthentication();
export const authenticateUnverified = createAuthentication({ allowUnverified: true });
