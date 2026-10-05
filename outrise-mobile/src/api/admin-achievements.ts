import { apiRequest } from "./client";

export const achievementCategories = [
  "workout",
  "personal_record",
  "progression",
  "echelon",
  "verification",
  "performance",
  "workout_of_the_week",
  "consistency",
  "oddity",
] as const;
export const achievementRules = [
  "workout_count",
  "personal_record_count",
  "level_reached",
  "echelon_reached",
  "verification_count",
  "verified_performance",
  "wotw_count",
  "workout_streak",
  "workout_total_reps",
  "workout_time_of_day",
] as const;
export type AchievementInput = {
  name: string;
  description: string;
  category: (typeof achievementCategories)[number];
  requirementType: (typeof achievementRules)[number];
  requirement: {
    value: number;
    exercise: string | null;
    recordCategory: string | null;
    operator: "before" | "after" | null;
  };
  xpReward: number;
  badgeKey: string;
  isSecret: boolean;
  isActive: boolean;
};
export type AdminAchievement = AchievementInput & { _id: string };

export async function getAdminAchievements(
  page = 1,
  search = "",
  status = "all",
): Promise<{
  achievements: AdminAchievement[];
  pagination: { page: number; totalPages: number; total: number };
}> {
  const response = await apiRequest(
    `/admin/achievements?page=${page}&limit=20&status=${status}${search ? `&search=${encodeURIComponent(search)}` : ""}`,
  );
  return response.json();
}

export async function getAdminAchievement(
  id: string,
): Promise<{ achievement: AdminAchievement }> {
  const response = await apiRequest(`/admin/achievements/${id}`);
  return response.json();
}

export async function saveAdminAchievement(
  data: AchievementInput,
  id?: string,
): Promise<{ achievement: AdminAchievement }> {
  const response = await apiRequest(
    `/admin/achievements${id ? `/${id}` : ""}`,
    { method: id ? "PUT" : "POST", body: JSON.stringify(data) },
  );
  return response.json();
}

export async function setAdminAchievementStatus(id: string, isActive: boolean) {
  const response = await apiRequest(`/admin/achievements/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ isActive }),
  });
  return response.json();
}
