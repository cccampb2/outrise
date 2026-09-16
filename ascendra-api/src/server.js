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
const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await connectDB();
    await Season.init();
    await WorkoutOfTheWeekOccurrence.init();
    await WorkoutSession.init();
    await reconcileSeasons();
    await reconcileWorkoutOfTheWeekOccurrences();
    startSeasonJob();
    startWorkoutOfTheWeekJob();
    app.listen(PORT, () => {
      logger.info(`Ascendra API is running on port ${PORT}`);
    });
  } catch (error) {
    logger.error("Failed to start Ascendra API", {
      error: error.message,
    });
    process.exit(1);
  }
};

startServer();
