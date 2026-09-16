import cron from "node-cron";
import { reconcileSeasons } from "../services/season.service.js";
import logger from "../utils/logger.js";
import { APP_TIME_ZONE } from "../config/app.js";

export const startSeasonJob = () => {
  cron.schedule(
    "0 * * * *",
    async () => {
      try {
        await reconcileSeasons();
      } catch (error) {
        logger.error("Season reconciliation failed", {
          error: error.message,
        });
      }
    },
    {
      timezone: APP_TIME_ZONE,
    },
  );
};
