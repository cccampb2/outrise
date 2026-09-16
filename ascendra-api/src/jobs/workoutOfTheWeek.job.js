import cron from "node-cron";

import { reconcileWorkoutOfTheWeekOccurrences } from "../services/workoutOfTheWeek.service.js";
import { APP_TIME_ZONE } from "../config/app.js";

import logger from "../utils/logger.js";

export const startWorkoutOfTheWeekJob = () => {
  cron.schedule(
    "0 * * * *",
    async () => {
      try {
        await reconcileWorkoutOfTheWeekOccurrences();

        logger.info("Workout of the Week reconciliation completed");
      } catch (error) {
        logger.info("Workout of the Week reconciliation failed", {
          error: error.message,
        });
      }
    },
    {
      timezone: APP_TIME_ZONE,
    },
  );
};
