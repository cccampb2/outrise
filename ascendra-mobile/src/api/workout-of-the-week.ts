import { apiRequest } from "./client";
import type {
  MeasurementType,
  WorkoutSession,
  WorkoutTarget,
} from "./workout-sessions";

export type WorkoutOfTheWeekStatus = "upcoming" | "active" | "completed";

export type WorkoutOfTheWeekSelectionSource = "admin" | "random";

export type WorkoutOfTheWeekExercise = {
  exercise: string;
  exerciseName: string;
  measurementType: MeasurementType;
  order: number;
  target: WorkoutTarget;
  _id: string;
};

export type WorkoutOfTheWeekDifficulty =
  | "easy"
  | "medium"
  | "hard"
  | "impossible"
  | "just_fun";

export type WorkoutOfTheWeekOccurrence = {
  _id: string;
  workoutOfTheWeek: {
    _id: string;
    name: string;
  };
  name: string;
  description: string;
  bonusXP: number;
  difficulty: WorkoutOfTheWeekDifficulty;
  startsAt: string;
  endsAt: string;
  status: WorkoutOfTheWeekStatus;
  exercises: WorkoutOfTheWeekExercise[];
  selectionSource: WorkoutOfTheWeekSelectionSource;
  selectedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CurrentWorkoutOfTheWeek = {
  occurrence: WorkoutOfTheWeekOccurrence;
  workoutSession: WorkoutSession | null;
};

export type CurrentWorkoutOfTheWeekResponse = {
  currentWorkoutOfTheWeek: CurrentWorkoutOfTheWeek | null;
};

export async function getCurrentWorkoutOfTheWeek(): Promise<CurrentWorkoutOfTheWeekResponse> {
  const response = await apiRequest("/workouts-of-the-week/current");

  return await response.json();
}
