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

  const queryString = searchParams.toString();

  const response = await apiRequest(
    `/exercises${queryString ? `?${queryString}` : ""}`,
  );

  return await response.json();
}
