import AppError from "./AppError.js";

class UnauthorizedError extends AppError {
  constructor(message) {
    super(message, 401);
  }
}

export default UnauthorizedError;
