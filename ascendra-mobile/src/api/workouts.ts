import { apiRequest } from "./client";
import type { MeasurementType, WorkoutTarget } from "./workout-sessions";

export type WorkoutVisibility = "private" | "public";

export type CreateWorkoutExerciseInput = {
  exercise: string;
  order: number;
  target: WorkoutTarget;
};

export type CreateWorkoutInput = {
  name: string;
  description?: string;
  exercises: CreateWorkoutExerciseInput[];
  visibility?: WorkoutVisibility;
};

export type WorkoutExerciseSummary = {
  exercise: {
    _id: string;
    name: string;
    slug: string;
    category: string;
    measurementType: MeasurementType;
  };
  order: number;
  target: WorkoutTarget;
};

export type WorkoutSummary = {
  _id: string;
  name: string;
  description: string;
  owner: string;
  exercises: WorkoutExerciseSummary[];
  visibility: WorkoutVisibility;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ExerciseCategory =
  | "strength"
  | "cardio"
  | "bodyweight"
  | "mobility";

export type WorkoutExerciseDetail = {
  exercise: {
    _id: string;
    name: string;
    slug: string;
    description: string;
    category: ExerciseCategory;
    muscleGroups: string[];
    equipment: string[];
    instructions: string[];
    videoUrl: string | null;
    measurementType: MeasurementType;
  };
  order: number;
  target: WorkoutTarget;
};

export type WorkoutDetail = {
  _id: string;
  name: string;
  description: string;
  owner: string;
  exercises: WorkoutExerciseDetail[];
  visibility: WorkoutVisibility;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type GetWorkoutByIdResponse = {
  workout: WorkoutDetail;
};

export type WorkoutPagination = {
  page: number;
  limit: number;
  totalWorkouts: number;
  totalPages: number;
};

export type GetMyWorkoutsResponse = {
  workouts: WorkoutSummary[];
  pagination: WorkoutPagination;
};

export async function getMyWorkouts(): Promise<GetMyWorkoutsResponse> {
  const response = await apiRequest("/workouts");

  return await response.json();
}

export async function getWorkoutById(
  workoutId: string,
): Promise<GetWorkoutByIdResponse> {
  const response = await apiRequest(`/workouts/${workoutId}`);

  return await response.json();
}

type CreateWorkoutResponse = {
  message: string;
  workout: WorkoutDetail;
};
export async function createWorkout(
  input: CreateWorkoutInput,
): Promise<CreateWorkoutResponse> {
  const response = await apiRequest("/workouts", {
    method: "POST",
    body: JSON.stringify(input),
  });

  return await response.json();
}
