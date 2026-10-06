import { apiRequest } from "./client";
import type { FactionColors, FactionSlug } from "./factions";
export type CompletedSeason = {
  _id: string;
  seasonNumber: number;
  quarter: number;
  year: number;
  startsAt: string;
  endsAt: string;
  winningFaction: {
    _id: string;
    name: string;
    slug: FactionSlug;
    colors: FactionColors;
  } | null;
};
export type SeasonHistory = {
  seasons: CompletedSeason[];
  pagination: {
    page: number;
    limit: number;
    totalSeasons: number;
    totalPages: number;
  };
};
export async function getSeasonHistory(page = 1): Promise<SeasonHistory> {
  const response = await apiRequest(`/seasons/history?page=${page}&limit=10`);
  return await response.json();
}
