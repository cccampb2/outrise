import { isCelebrateError } from "celebrate";
import logger from "../utils/logger.js";
import AccountRestrictedError from "../errors/AccountRestrictedError.js";

export const errorHandler = (error, req, res, next) => {
  if (error instanceof AccountRestrictedError) {
    return res.status(error.statusCode).json({
      error: error.name,
      message: error.message,
      code: error.code,
      accountStatus: error.accountStatus,
      suspendedUntil: error.suspendedUntil,
    });
  }
  if (
    error.statusCode === 401 &&
    ["SESSION_EXPIRED", "ACCOUNT_DELETION_PENDING"].includes(error.code)
  ) {
    return res.status(401).json({
      error: error.name,
      code: error.code,
      message: error.message,
    });
  }
  if (
    error.statusCode === 403 &&
    ["EMAIL_VERIFICATION_REQUIRED", "AGE_ELIGIBILITY_REQUIRED"].includes(
      error.code,
    )
  ) {
    return res
      .status(403)
      .json({ error: error.name, code: error.code, message: error.message });
  }
  if (isCelebrateError(error)) {
    const validationErrors = [];

    for (const [segment, joiError] of error.details.entries()) {
      joiError.details.forEach((detail) => {
        validationErrors.push({
          segment,
          field: detail.path.join("."),
          message: detail.message,
        });
      });
    }
    return res.status(400).json({
      error: "ValidationError",
      message: "Request validation failed",
      details: validationErrors,
    });
  }

  if (error.code === 11000) {
    return res.status(409).json({
      error: "ConflictError",
      message: "A record with this unique value already exists",
    });
  }
  logger.error("Unhandled application error", {
    message: error.message,
    stack: error.stack,
    method: req.method,
    url: req.originalUrl,
  });

  const statusCode = error.statusCode || 500;
  if (
    [429, 502].includes(statusCode) &&
    Number.isInteger(error.retryAfterSeconds) &&
    error.retryAfterSeconds > 0
  ) {
    res.set("Retry-After", String(error.retryAfterSeconds));
  }
  return res.status(statusCode).json({
    error: error.name || "InternalServerError",
    message: error.message || "Something went wrong",
  });
};
