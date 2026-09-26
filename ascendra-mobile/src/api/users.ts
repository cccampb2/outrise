import { apiRequest } from "./client";

export type CurrentUser = {
  id: string;
  username: string;
  email: string;
  role: string;
  accountStatus: string;
  faction: string | null;
  lifetimeXP: number;
  totalWorkouts: number;
  createdAt: string;
  progression: {
    level: number;
    echelon: number | null;
    xpIntoCurrentLevel: number;
    xpRequiredForNextLevel: number;
    xpRemaining: number;
    progressPercent: number;
  };
  ranking: {
    globalRank: number | null;
    zenithRank: number | null;
  };
};

export async function getCurrentUser(): Promise<CurrentUser> {
  const response = await apiRequest("/users/me");

  return await response.json();
}
