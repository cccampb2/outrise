import cron from "node-cron";
import {
  cleanupSupportRecords,
  cleanupModerationRecords,
} from "../services/supportRetention.service.js";
import { APP_TIME_ZONE } from "../config/app.js";
import logger from "../utils/logger.js";

export function startSupportRetentionJob() {
  let running = false;
  async function run() {
    if (running) return;
    running = true;
    try {
      // A failure in one category must not prevent the other category from cleaning up.
      for (const cleanup of [cleanupSupportRecords, cleanupModerationRecords]) {
        try {
          logger.info("Support retention cleanup completed", await cleanup());
        } catch (error) {
          logger.warn("Support retention cleanup will retry on the next run.", {
            cleanup: cleanup.name,
            errorType: error?.name ?? "Error",
            errorCode: typeof error?.code === "number" ? error.code : undefined,
          });
        }
      }
    } finally {
      running = false;
    }
  }
  const task = cron.schedule("45 3 * * *", run, { timezone: APP_TIME_ZONE });
  void run();
  return task;
}
