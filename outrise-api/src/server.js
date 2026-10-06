import { startSupportRetentionJob } from "./jobs/supportRetention.job.js";
import Suggestion from "./models/Suggestion.js";
import { startActivityRetentionJob } from "./jobs/activityRetention.job.js";
import ActivityEvent from "./models/ActivityEvent.js";
import NotificationState from "./models/NotificationState.js";
import ActivityDismissal from "./models/ActivityDismissal.js";
import { startVerificationRetentionJob } from "./jobs/verificationRetention.job.js";
import UserBlock from "./models/UserBlock.js";
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
import Verification from "./models/Verification.js";
import Conversation from "./models/Conversation.js";
import Message from "./models/Message.js";
import SystemMessage from "./models/SystemMessage.js";
import AccountDeletion from "./models/AccountDeletion.js";
import { startAccountDeletionJob } from "./jobs/accountDeletion.job.js";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { socketAuth } from "./middleware/socketAuth.js";

const PORT = process.env.PORT || 3000;
const httpServer = createServer(app);
const io = new Server(httpServer);
io.use(socketAuth);
app.set("io", io);

io.on("connection", (socket) => {
  const userId = socket.data.userId;

  socket.join(`user:${userId}`);

  logger.info("Socket connected", {
    userId,
    socketId: socket.id,
  });

  let checkingAccess = false;

  const accessInterval = setInterval(async () => {
    if (!socket.connected || checkingAccess) {
      return;
    }

    checkingAccess = true;

    try {
      await socketAuth(socket, (error) => {
        if (error && socket.connected) {
          logger.info("Socket access check failed", {
            userId,
            socketId: socket.id,
          });

          socket.disconnect(true);
        }
      });
    } finally {
      checkingAccess = false;
    }
  }, 30000);

  socket.on("disconnect", (reason) => {
    clearInterval(accessInterval);
    logger.info("Socket disconnected", {
      userId,
      socketId: socket.id,
      reason,
    });
  });
});

const startServer = async () => {
  try {
    await connectDB();
    await Conversation.init();
    await Message.init();
    await SystemMessage.init();
    await AccountDeletion.init();
    await UserBlock.init();
    await AccountModeration.init();
    await IssueReport.init();
    await Suggestion.init();
    await UserRoleChange.init();
    await Verification.init();
    await ActivityEvent.init();
    await NotificationState.init();
    await ActivityDismissal.init();
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
    startAccountDeletionJob(io);
    startVerificationRetentionJob();
    startActivityRetentionJob();
    startSupportRetentionJob();
    startWorkoutOfTheWeekJob();
    httpServer.listen(PORT, () => {
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
