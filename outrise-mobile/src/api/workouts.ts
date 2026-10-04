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
    isActive: boolean;
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

export async function getMyWorkouts(
  params: GetMyWorkoutsParams = {},
): Promise<GetMyWorkoutsResponse> {
  const searchParams = new URLSearchParams();

  if (params.page !== undefined) {
    searchParams.set("page", String(params.page));
  }

  if (params.limit !== undefined) {
    searchParams.set("limit", String(params.limit));
  }

  if (params.status !== undefined) {
    searchParams.set("status", params.status);
  }

  if (params.search !== undefined) {
    searchParams.set("search", params.search);
  }

  const queryString = searchParams.toString();

  const response = await apiRequest(
    `/workouts${queryString ? `?${queryString}` : ""}`,
  );

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

export type GetMyWorkoutsParams = {
  page?: number;
  limit?: number;
  status?: "active" | "archived";
  search?: string;
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

export type UpdateWorkoutInput = Partial<CreateWorkoutInput>;

export async function updateWorkout(
  workoutId: string,
  input: UpdateWorkoutInput,
): Promise<void> {
  await apiRequest(`/workouts/${workoutId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function archiveWorkout(workoutId: string): Promise<void> {
  await apiRequest(`/workouts/${workoutId}/archive`, {
    method: "PATCH",
  });
}

export async function restoreWorkout(workoutId: string): Promise<void> {
  await apiRequest(`/workouts/${workoutId}/restore`, {
    method: "PATCH",
  });
}

export async function duplicateWorkout(workoutId: string): Promise<void> {
  await apiRequest(`/workouts/${workoutId}/duplicate`, {
    method: "POST",
  });
}
