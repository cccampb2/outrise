import "dotenv/config";
import app from "./app.js";
import { connectDB } from "./config/db.js";
import logger from "./utils/logger.js";
import { reconcileSeasons } from "./services/season.service.js";
import Season from "./models/Season.js";
import { startSeasonJob } from "./jobs/season.job.js";
import { startWorkoutOfTheWeekJob } from "./jobs/workoutOfTheWeek.job.js";
import { reconcileWorkoutOfTheWeekOccurrences } from "./services/workoutOfTheWeek.service.js";
import WorkoutOfTheWeekOccurrence from "./models/WorkoutOfTheWeekOccurrence.js";
import WorkoutSession from "./models/WorkoutSession.js";
import NoEligibleWorkoutOfTheWeekError from "./errors/NoEligibleWorkoutOfTheWeekError.js";
import { restoreExpiredSuspensions } from "./services/accountAccess.service.js";
import { startAccountSuspensionJob } from "./jobs/accountSuspension.job.js";
import AccountModeration from "./models/AccountModeration.js";
import IssueReport from "./models/IssueReport.js";
import UserRoleChange from "./models/UserRoleChange.js";
const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await connectDB();
    await AccountModeration.init();
    await IssueReport.init();
    await UserRoleChange.init();
    await restoreExpiredSuspensions();
    await Season.init();
    await WorkoutOfTheWeekOccurrence.init();
    await WorkoutSession.init();
    await reconcileSeasons();
    try {
      await reconcileWorkoutOfTheWeekOccurrences();
    } catch (error) {
      if (error instanceof NoEligibleWorkoutOfTheWeekError) {
        logger.warn("Workout of the Week is unavailable during startup", {
          error: error.message,
        });
      } else {
        throw error;
      }
    }
    startSeasonJob();
    startAccountSuspensionJob();
    startWorkoutOfTheWeekJob();
    app.listen(PORT, () => {
      logger.info(`Outrise API is running on port ${PORT}`);
    });
  } catch (error) {
    logger.error("Failed to start Outrise API", {
      error: error.message,
    });
    process.exit(1);
  }
};

startServer();
