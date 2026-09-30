import BadRequestError from "../errors/BadRequestError.js";

export const parseVerificationSubmission = (req, res, next) => {
  try {
    if (!req.body.performance) {
      throw new BadRequestError("Performance is required");
    }

    if (typeof req.body.performance === "string") {
      try {
        req.body.performance = JSON.parse(req.body.performance);
      } catch {
        throw new BadRequestError("Performance must be valid JSON");
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};
