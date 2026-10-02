import type { UserRole } from "@/constants/user-roles";
import { apiRequest } from "./client";
import { FactionSlug } from "./factions";

export type LeaderboardFaction = {
  _id: string;
  name: string;
  slug: string;
};

export type GlobalLeaderboardUser = {
  userId: string;
  username: string;
  role: UserRole;
  lifetimeXP: number;
  level: number;
  echelon: number | null;
  faction: LeaderboardFaction | null;
  rank: number;
  zenithRank: number | null;
};

export type LeaderboardPagination = {
  page: number;
  limit: number;
  totalUsers: number;
  totalPages: number;
};

export type FriendsLeaderboardUser = Omit<GlobalLeaderboardUser, "zenithRank">;

export type GetFriendsLeaderboardResponse = {
  leaderboard: FriendsLeaderboardUser[];
  currentUser: FriendsLeaderboardUser | null;
  pagination: LeaderboardPagination;
};

export async function getFriendsLeaderboard(
  { page = 1, limit = 25 }: { page?: number; limit?: number } = {},
): Promise<GetFriendsLeaderboardResponse> {
  const response = await apiRequest(`/leaderboards/friends?page=${page}&limit=${limit}`);
  return response.json();
}

export type GetGlobalLeaderboardResponse = {
  leaderboard: GlobalLeaderboardUser[];
  pagination: LeaderboardPagination;
  currentUser: GlobalLeaderboardUser | null;
};

export type GetGlobalLeaderboardParams = {
  page?: number;
  limit?: number;
};

export type FactionColors = {
  primary: string;
  hover: string;
  deep: string;
  darkSurface: string;
  border: string;
  glow: string;
};

export type FactionStandingFaction = {
  _id: string;
  name: string;
  slug: FactionSlug;
  colors: FactionColors;
};

export type FactionStanding = {
  rank: number;
  faction: FactionStandingFaction;
  seasonXP: number;
};

export type LeaderboardSeason = {
  id: string;
  seasonNumber: number;
  quarter: number;
  year: number;
  startsAt: string;
  endsAt: string;
};

export type GetFactionStandingsResponse = {
  season: LeaderboardSeason | null;
  standings: FactionStanding[];
};

export type FactionLeaderboardFaction = {
  _id: string;
  name: string;
  slug: FactionSlug;
  description: string;
  motto: string;
  tagline: string;
  values: string[];
  colors: FactionColors;
};

export type FactionLeaderboardUser = {
  userId: string;
  username: string;
  role: UserRole;
  seasonXP: number;
  rank: number;
};

export type FactionLeaderboardStanding = {
  rank: number;
  seasonXP: number;
};

export type GetFactionLeaderboardResponse = {
  season: LeaderboardSeason | null;
  faction: FactionLeaderboardFaction;
  factionStanding: FactionLeaderboardStanding | null;
  currentUser: FactionLeaderboardUser | null;
  leaderboard: FactionLeaderboardUser[];
  pagination: LeaderboardPagination;
};

export type GetFactionLeaderboardParams = {
  factionSlug: FactionSlug;
  page?: number;
  limit?: number;
};

export async function getGlobalLeaderboard(
  params: GetGlobalLeaderboardParams = {},
): Promise<GetGlobalLeaderboardResponse> {
  const searchParams = new URLSearchParams();

  if (params.page !== undefined) {
    searchParams.set("page", String(params.page));
  }

  if (params.limit !== undefined) {
    searchParams.set("limit", String(params.limit));
  }

  const queryString = searchParams.toString();

  const response = await apiRequest(
    `/leaderboards/global${queryString ? `?${queryString}` : ""}`,
  );

  return await response.json();
}

export async function getFactionStandings(): Promise<GetFactionStandingsResponse> {
  const response = await apiRequest("/leaderboards/factions");

  return await response.json();
}

export async function getFactionLeaderboard({
  factionSlug,
  page,
  limit,
}: GetFactionLeaderboardParams): Promise<GetFactionLeaderboardResponse> {
  const searchParams = new URLSearchParams();

  if (page !== undefined) {
    searchParams.set("page", String(page));
  }

  if (limit !== undefined) {
    searchParams.set("limit", String(limit));
  }

  const queryString = searchParams.toString();

  const response = await apiRequest(
    `/leaderboards/factions/${factionSlug}${
      queryString ? `?${queryString}` : ""
    }`,
  );

  return await response.json();
}
