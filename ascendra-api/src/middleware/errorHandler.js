import { isCelebrateError } from "celebrate";
import logger from "../utils/logger.js";

export const errorHandler = (error, req, res, next) => {
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
  return res.status(statusCode).json({
    error: error.name || "InternalServerError",
    message: error.message || "Something went wrong",
  });
};
