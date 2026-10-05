import { apiRequest } from "./client";
import type { Exercise } from "./exercises";
import type { WorkoutTarget } from "./workout-sessions";
import type {
  WorkoutOfTheWeekDifficulty,
  WorkoutOfTheWeekOccurrence,
  WorkoutOfTheWeekStatus,
} from "./workout-of-the-week";

export const wotwDifficulties = [
  "easy",
  "medium",
  "hard",
  "impossible",
  "just_fun",
] as const;
export type WotwTemplate = {
  _id: string;
  name: string;
  description: string;
  difficulty: WorkoutOfTheWeekDifficulty;
  bonusXP: number;
  isActive: boolean;
  exercises: {
    _id: string;
    exercise: Exercise | null;
    order: number;
    target: WorkoutTarget;
  }[];
  createdBy: { _id: string; username: string } | null;
};
export type WotwTemplateInput = {
  name: string;
  description: string;
  difficulty: WorkoutOfTheWeekDifficulty;
  bonusXP: number;
  exercises: { exercise: string; order: number; target: WorkoutTarget }[];
};
export type WotwTemplateResponse = {
  workoutOfTheWeek: WotwTemplate;
  createdNewTemplate?: boolean;
};
export type AdminWotwOccurrence = Omit<
  WorkoutOfTheWeekOccurrence,
  "workoutOfTheWeek"
> & { workoutOfTheWeek: string };

export async function getWotwTemplates(
  page = 1,
  status: "active" | "archived" = "active",
): Promise<{
  workoutOfTheWeekTemplates: WotwTemplate[];
  pagination: { page: number; totalTemplates: number; totalPages: number };
}> {
  const response = await apiRequest(
    `/workouts-of-the-week?page=${page}&limit=20&status=${status}`,
  );
  return response.json();
}

export async function getWotwTemplate(
  id: string,
): Promise<WotwTemplateResponse> {
  const response = await apiRequest(`/workouts-of-the-week/${id}`);
  return response.json();
}

export async function saveWotwTemplate(
  input: WotwTemplateInput,
  id?: string,
): Promise<WotwTemplateResponse> {
  const response = await apiRequest(
    `/workouts-of-the-week${id ? `/${id}` : ""}`,
    {
      method: id ? "PATCH" : "POST",
      body: JSON.stringify(input),
    },
  );
  return response.json();
}

export async function setWotwArchived(
  id: string,
  archived: boolean,
): Promise<WotwTemplateResponse> {
  const response = await apiRequest(
    `/workouts-of-the-week/${id}/${archived ? "archive" : "restore"}`,
    { method: "PATCH" },
  );
  return response.json();
}

export async function scheduleWotw(
  workoutOfTheWeekId: string,
  startDate: string,
): Promise<{ occurrence: AdminWotwOccurrence }> {
  const response = await apiRequest("/workouts-of-the-week/occurrences", {
    method: "POST",
    body: JSON.stringify({ workoutOfTheWeekId, startDate }),
  });
  return response.json();
}

export async function getWotwSchedule(
  page = 1,
  status: WorkoutOfTheWeekStatus | "all" = "all",
): Promise<{
  occurrences: AdminWotwOccurrence[];
  pagination: { page: number; totalPages: number };
}> {
  const response = await apiRequest(
    `/workouts-of-the-week/occurrences?page=${page}&limit=20&status=${status}`,
  );
  return response.json();
}
