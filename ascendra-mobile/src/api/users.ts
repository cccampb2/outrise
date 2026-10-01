import { apiRequest } from "./client";
import type { FactionColors, FactionSlug } from "./factions";

export type UserProgression = {
  level: number;
  echelon: number | null;
  xpIntoCurrentLevel: number;
  xpRequiredForNextLevel: number;
  xpRemaining: number;
  progressPercent: number;
};

export type UserRanking = {
  globalRank: number | null;
  zenithRank: number | null;
};

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
  progression: UserProgression;
  ranking: UserRanking;
};

export type PublicUserFaction = {
  _id: string;
  slug: FactionSlug;
  name: string;
  colors: FactionColors;
};

export type PublicUser = {
  id: string;
  username: string;
  faction: PublicUserFaction | null;
  lifetimeXP: number;
  totalWorkouts: number;
  createdAt: string;
  progression: UserProgression;
  ranking: UserRanking;
};

export type PublicUserResponse = {
  user: PublicUser;
};

export async function getCurrentUser(): Promise<CurrentUser> {
  const response = await apiRequest("/users/me");

  return await response.json();
}

export async function getPublicUser(
  userId: string,
): Promise<PublicUserResponse> {
  const response = await apiRequest(`/users/${userId}`);

  return await response.json();
}
