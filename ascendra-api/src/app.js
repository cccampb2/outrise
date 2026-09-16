import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import factionRoutes from "./routes/faction.routes.js";
import exerciseRoutes from "./routes/exercise.routes.js";
import workoutRoutes from "./routes/workout.routes.js";
import workoutSessionRoutes from "./routes/workoutSession.routes.js";
import personalRecordRoutes from "./routes/personalRecord.routes.js";
import leaderboardRoutes from "./routes/leaderboard.routes.js";
import seasonRoutes from "./routes/season.routes.js";
import workoutOfTheWeekRoutes from "./routes/workoutOfTheWeek.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/factions", factionRoutes);
app.use("/exercises", exerciseRoutes);
app.use("/workouts", workoutRoutes);
app.use("/workout-sessions", workoutSessionRoutes);
app.use("/personal-records", personalRecordRoutes);
app.use("/leaderboards", leaderboardRoutes);
app.use("/seasons", seasonRoutes);
app.use("/workouts-of-the-week", workoutOfTheWeekRoutes);

app.use(errorHandler);

export default app;
