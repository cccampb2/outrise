import { apiRequest } from "./client";
import type {
  VerificationMeasurementType,
  VerificationPerformance,
} from "./verifications";

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};
export type ProfileAchievement = {
  id: string;
  unlocked: boolean;
  unlockedAt: string | null;
  achievement: {
    _id: string;
    name: string;
    description: string;
    category: string;
    badgeKey: string;
    isSecret: boolean;
  } | null;
};
export type ProfilePerformance = {
  id: string;
  exercise: { _id: string; name: string } | null;
  measurementType: VerificationMeasurementType;
  performance: VerificationPerformance;
  approvedAt: string | null;
  submittedAt: string;
};

export async function getProfileAchievements(
  userId: string,
  page = 1,
  limit = 6,
  view: "unlocked" | "catalog" = "unlocked",
): Promise<{ achievements: ProfileAchievement[]; pagination: Pagination }> {
  const response = await apiRequest(
    `/users/${userId}/achievements?page=${page}&limit=${limit}&view=${view}`,
  );
  return response.json();
}

export async function getProfilePerformances(
  userId: string,
  page = 1,
): Promise<{ performances: ProfilePerformance[]; pagination: Pagination }> {
  const response = await apiRequest(
    `/users/${userId}/performances?page=${page}&limit=5`,
  );
  return response.json();
}
