import { apiRequest } from "./client";
import type { MeasurementType } from "./workout-sessions";

export type ExerciseCategory =
  | "strength"
  | "cardio"
  | "bodyweight"
  | "mobility";

export type Exercise = {
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
  isActive: boolean;
  baseXP?: number;
};

export type ExercisePagination = {
  page: number;
  limit: number;
  totalExercises: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type GetExercisesResponse = {
  exercises: Exercise[];
  pagination: ExercisePagination;
};

export type GetExercisesParams = {
  page?: number;
  limit?: number;
  category?: ExerciseCategory;
  muscleGroup?: string;
  search?: string;
  status?: "active" | "archived" | "all";
};

export async function getExercises(
  params: GetExercisesParams = {},
): Promise<GetExercisesResponse> {
  const searchParams = new URLSearchParams();

  if (params.page !== undefined) {
    searchParams.set("page", String(params.page));
  }

  if (params.limit !== undefined) {
    searchParams.set("limit", String(params.limit));
  }

  if (params.category !== undefined) {
    searchParams.set("category", params.category);
  }

  if (params.muscleGroup !== undefined) {
    searchParams.set("muscleGroup", params.muscleGroup);
  }

  if (params.search !== undefined) {
    searchParams.set("search", params.search);
  }

  if (params.status !== undefined) searchParams.set("status", params.status);

  const queryString = searchParams.toString();

  const response = await apiRequest(
    `/exercises${queryString ? `?${queryString}` : ""}`,
  );

  return await response.json();
}

type GetExerciseByIdResponse = {
  exercise: Exercise;
};

export async function getExerciseById(
  exerciseId: string,
): Promise<GetExerciseByIdResponse> {
  const response = await apiRequest(`/exercises/${exerciseId}`);

  return await response.json();
}

export type GetExerciseMuscleGroupsResponse = {
  muscleGroups: string[];
};

export async function getExerciseMuscleGroups(): Promise<GetExerciseMuscleGroupsResponse> {
  const response = await apiRequest("/exercises/meta/muscle-groups");

  return await response.json();
}

export type ExerciseInput = Omit<Exercise, "_id" | "isActive" | "baseXP"> & {
  baseXP: number;
};

export async function createExercise(
  input: ExerciseInput,
): Promise<{ exercise: Exercise }> {
  const response = await apiRequest("/exercises", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return response.json();
}

export async function updateExercise(
  id: string,
  input: ExerciseInput,
): Promise<{ exercise: Exercise }> {
  const response = await apiRequest(`/exercises/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return response.json();
}

export async function setExerciseArchived(
  id: string,
  archived: boolean,
): Promise<{ exercise: Exercise }> {
  const response = await apiRequest(
    `/exercises/${id}/${archived ? "archive" : "restore"}`,
    { method: "PATCH" },
  );
  return response.json();
}
