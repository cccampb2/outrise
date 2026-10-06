import cron from "node-cron";
import { processAccountDeletion } from "../services/accountDeletion.service.js";
import logger from "../utils/logger.js";
export function startAccountDeletionJob(io) {
  let running = false;
  async function run() {
    if (running) return;
    running = true;
    try {
      for (let count = 0; count < 10; count++) {
        if (!(await processAccountDeletion({ io }))) break;
      }
    } catch {
      logger.warn("Account deletion worker could not complete its check.");
    } finally {
      running = false;
    }
  }
  cron.schedule("* * * * *", () => {
    void run();
  });
  void run();
}
