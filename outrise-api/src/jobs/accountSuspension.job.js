import cron from "node-cron";
import { restoreExpiredSuspensions } from "../services/accountAccess.service.js";
import logger from "../utils/logger.js";

export function startAccountSuspensionJob() {
  cron.schedule("* * * * *", async () => {
    try {
      await restoreExpiredSuspensions();
    } catch (error) {
      logger.error("Unable to restore expired suspensions", {
        error: error.message,
      });
    }
  });
}
