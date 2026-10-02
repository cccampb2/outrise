import Faction from "../models/Faction.js";
import SeasonContribution from "../models/SeasonContribution.js";
import { createActivityEvent } from "./activity.service.js";

export const FACTION_XP_MILESTONES = [100000, 500000, 1000000];

export async function getFactionActivityStandings(seasonId, mongoSession) {
  const totals = await SeasonContribution.aggregate([
    { $match: { season: seasonId } },
    { $group: { _id: "$faction", totalXP: { $sum: "$xp" } } },
  ]).session(mongoSession);
  const factions = await Faction.find().select("name").session(mongoSession).lean();
  const xp = new Map(totals.map((total) => [total._id.toString(), total.totalXP]));
  return factions.map((faction) => ({ id: faction._id, name: faction.name, totalXP: xp.get(faction._id.toString()) ?? 0 }))
    .sort((a, b) => b.totalXP - a.totalXP || a.id.toString().localeCompare(b.id.toString()))
    .map((faction, index) => ({ ...faction, rank: index + 1 }));
}

export function buildFactionSeasonEvents({ season, before, after }) {
  const previous = new Map(before.map((faction) => [faction.id.toString(), faction]));
  const events = [];
  for (const faction of after) {
    const old = previous.get(faction.id.toString());
    if (!old) continue;
    const base = { audience: "faction", faction: faction.id, sourceType: "season", sourceId: season._id };
    const details = { factionName: faction.name, seasonNumber: season.seasonNumber };
    const key = `season:${season._id}:faction:${faction.id}`;
    if (old.rank !== faction.rank) events.push({ ...base, type: "faction_rank_changed", details: { ...details, previousRank: old.rank, rank: faction.rank }, idempotencyKey: `${key}:rank:${season.activityRevision}` });
    if (faction.rank === 1 && faction.totalXP > 0 && (old.rank !== 1 || old.totalXP === 0)) events.push({ ...base, type: "faction_first_place", details, idempotencyKey: `${key}:first:${season.activityRevision}` });
    for (const milestone of FACTION_XP_MILESTONES) {
      if (old.totalXP < milestone && faction.totalXP >= milestone) events.push({ ...base, type: "faction_milestone", details: { ...details, milestone, totalXP: faction.totalXP }, idempotencyKey: `${key}:xp:${milestone}` });
    }
  }
  return events;
}

export async function recordFactionSeasonChanges({ season, before, mongoSession }) {
  const after = await getFactionActivityStandings(season._id, mongoSession);
  for (const event of buildFactionSeasonEvents({ season, before, after })) await createActivityEvent(event, { mongoSession });
}

export async function recordSeasonWin(season, mongoSession) {
  if (!season.winningFaction) return;
  const faction = await Faction.findById(season.winningFaction).select("name").session(mongoSession);
  if (!faction) return;
  await createActivityEvent({
    type: "faction_season_won", audience: "faction", faction: faction._id,
    sourceType: "season", sourceId: season._id,
    details: { factionName: faction.name, seasonNumber: season.seasonNumber },
    occurredAt: season.endsAt, idempotencyKey: `season:${season._id}:winner`,
  }, { mongoSession });
}
