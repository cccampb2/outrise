import AppError from "./AppError.js";

class NoEligibleWorkoutOfTheWeekError extends AppError {
  constructor() {
    super("No eligible Workout of the Week templates are available", 409);
  }
}

export default NoEligibleWorkoutOfTheWeekError;
