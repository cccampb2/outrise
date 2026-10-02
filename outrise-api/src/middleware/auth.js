import jwt from "jsonwebtoken";
import UnauthorizedError from "../errors/UnauthorizedError.js";
import User from "../models/User.js";
import { ensureAccountAccess } from "../services/accountAccess.service.js";

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedError("Authentication required");
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const account = await User.findById(decoded.userId)
      .select("role accountStatus suspendedUntil +tokenVersion");
    // Legacy tokens/documents count as version zero until the first reset.
    if (account && (decoded.tokenVersion ?? 0) !== (account.tokenVersion ?? 0)) {
      const error = new UnauthorizedError("Your session ended. Sign in again.");
      error.code = "SESSION_EXPIRED";
      throw error;
    }
    const user = await ensureAccountAccess(account);
    // Use the current database role, rather than a potentially stale token role.
    req.user = { ...decoded, userId: user._id.toString(), role: user.role };

    next();
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return next(new UnauthorizedError("Invalid or expired token"));
    }
    next(error);
  }
};
