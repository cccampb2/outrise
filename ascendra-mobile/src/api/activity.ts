import { apiRequest } from "./client";

export async function dismissAllActivityEvents(): Promise<void> {
  await apiRequest("/activity/dismiss-all", { method: "POST" });
}

export async function dismissActivityEvents(eventIds: string[]): Promise<void> {
  await apiRequest("/activity/dismiss", { method: "POST", body: JSON.stringify({ eventIds }) });
}

type ActivityEventBase = {
  _id: string;
  actor: string | null;
  sourceId: string;
  occurredAt: string;
};

export type ActivityEvent = ActivityEventBase & (
  { type: "friend_request_received" | "friend_request_accepted"; sourceType: "friendship"; details: { actorUsername: string } }
  | { type: "echelon_reached"; sourceType: "xp_transaction"; details: { actorUsername: string; echelon: number } }
  | { type: "wotw_completed"; sourceType: "workout_of_the_week_occurrence"; details: { actorUsername: string; workoutName: string } }
  | { type: "achievement_unlocked"; sourceType: "achievement"; details: { actorUsername: string; achievementName: string } }
  | { type: "verification_approved" | "verification_rejected"; sourceType: "verification"; details: { actorUsername: string; exerciseName: string } }
  | { type: "workout_completed"; sourceType: "workout_session"; details: { actorUsername: string; workoutName: string } }
  | { type: "wotw_launched"; sourceType: "workout_of_the_week_occurrence"; details: { workoutName: string } }
  | { type: "faction_rank_changed"; sourceType: "season"; faction: string; details: { factionName: string; seasonNumber: number; previousRank: number; rank: number } }
  | { type: "faction_first_place" | "faction_season_won"; sourceType: "season"; faction: string; details: { factionName: string; seasonNumber: number } }
  | { type: "faction_milestone"; sourceType: "season"; faction: string; details: { factionName: string; seasonNumber: number; milestone: number; totalXP: number } }
  | { type: "personal_record_set"; sourceType: "personal_record"; details: {
    actorUsername: string; exerciseName: string;
    recordType: "max_weight" | "max_reps" | "fastest_time" | "fastest_distance_time" | "longest_duration";
    recordCategory: string | null; value: number; unit: "lb" | "reps" | "seconds"; distanceMiles: number | null;
  } }
);

export async function getActivityFeed(page = 1, limit = 5): Promise<{
  events: ActivityEvent[];
  pagination: { page: number; limit: number; totalEvents: number; totalPages: number };
}> {
  const response = await apiRequest(`/activity?page=${page}&limit=${limit}`);
  return response.json();
}
