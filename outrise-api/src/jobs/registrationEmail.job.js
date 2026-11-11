import cron from "node-cron";
import { processRegistrationEmail } from "../services/registration.service.js";
import logger from "../utils/logger.js";

export function startRegistrationEmailJob() {
  let running = false;
  async function run() {
    if (running) return;
    running = true;
    try {
      // Limit each pass so a backlog cannot monopolize the process.
      for (let index = 0; index < 10; index++) {
        if (!(await processRegistrationEmail())) break;
      }
    } catch (error) {
      logger.warn("Registration email queue will retry on the next run.", {
        errorType: error?.name ?? "Error",
      });
    } finally {
      running = false;
    }
  }
  const task = cron.schedule("*/10 * * * * *", run);
  void run();
  return task;
}
