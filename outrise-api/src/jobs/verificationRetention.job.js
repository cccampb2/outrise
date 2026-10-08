import cron from "node-cron";
import {
  cleanupReviewedVerificationVideos,
  cleanupPendingVerificationVideos,
} from "../services/verificationRetention.service.js";
import { APP_TIME_ZONE } from "../config/app.js";
import logger from "../utils/logger.js";

export function startVerificationRetentionJob() {
  let running = false;
  async function run() {
    if (running) return;
    running = true;
    try {
      const result = await cleanupReviewedVerificationVideos();
      logger.info("Reviewed verification video cleanup completed", result);
      const pending = await cleanupPendingVerificationVideos();
      logger.info("Pending verification video cleanup completed", pending);
    } catch (error) {
      logger.warn(
        "Reviewed verification video cleanup could not complete its check.",
        {
          errorType: error?.name ?? "Error",
          errorCode: typeof error?.code === "number" ? error.code : undefined,
        },
      );
    } finally {
      running = false;
    }
  }
  const task = cron.schedule("0 3 * * *", run, { timezone: APP_TIME_ZONE });
  // Catch up when the backend restarts after missing a scheduled run.
  void run();
  return task;
}
