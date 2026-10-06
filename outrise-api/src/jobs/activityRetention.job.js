import cron from "node-cron";
import { cleanupExpiredActivity } from "../services/activityRetention.service.js";
import { APP_TIME_ZONE } from "../config/app.js";
import logger from "../utils/logger.js";

export function startActivityRetentionJob() {
  let running = false;
  async function run() {
    if (running) return;
    running = true;
    try {
      const result = await cleanupExpiredActivity();
      logger.info("Activity and notification cleanup completed", result);
    } catch (error) {
      // Old events remain eligible for the next run; do not log event contents.
      logger.warn(
        "Activity and notification cleanup will retry on the next run.",
        {
          errorType: error?.name ?? "Error",
          errorCode: typeof error?.code === "number" ? error.code : undefined,
        },
      );
    } finally {
      running = false;
    }
  }
  const task = cron.schedule("30 3 * * *", run, { timezone: APP_TIME_ZONE });
  void run();
  return task;
}
