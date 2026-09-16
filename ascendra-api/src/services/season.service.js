import Season from "../models/Season.js";
import SeasonContribution from "../models/SeasonContribution.js";
import mongoose from "mongoose";
import Faction from "../models/Faction.js";

import {
  getQuarterFromDate,
  getQuarterStartDate,
  getQuarterEndDate,
  getNextQuarter,
} from "../utils/seasons.js";

export const initializeSeasons = async (mongoSession = null) => {
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentQuarter = getQuarterFromDate(now);

  const activeSeason = await Season.findOne({ status: "active" }).session(
    mongoSession,
  );
  const upcomingSeason = await Season.findOne({ status: "upcoming" }).session(
    mongoSession,
  );

  if (activeSeason && upcomingSeason) {
    return {
      activeSeason,
      upcomingSeason,
    };
  }

  const latestSeason = await Season.findOne()
    .sort({ seasonNumber: -1 })
    .session(mongoSession);

  let nextSeasonNumber = latestSeason?.seasonNumber + 1 || 1;

  let currentActiveSeason = activeSeason;

  if (!currentActiveSeason) {
    const startsAt = getQuarterStartDate(currentYear, currentQuarter);
    const endsAt = getQuarterEndDate(currentYear, currentQuarter);

    currentActiveSeason = new Season({
      seasonNumber: nextSeasonNumber,
      quarter: currentQuarter,
      year: currentYear,
      startsAt,
      endsAt,
      status: "active",
    });

    await currentActiveSeason.save({ session: mongoSession });
    nextSeasonNumber += 1;
  }

  let currentUpcomingSeason = upcomingSeason;

  if (!currentUpcomingSeason) {
    const nextQuarter = getNextQuarter({
      year: currentActiveSeason.year,
      quarter: currentActiveSeason.quarter,
    });

    const startsAt = getQuarterStartDate(nextQuarter.year, nextQuarter.quarter);

    const endsAt = getQuarterEndDate(nextQuarter.year, nextQuarter.quarter);

    currentUpcomingSeason = new Season({
      seasonNumber: nextSeasonNumber,
      quarter: nextQuarter.quarter,
      year: nextQuarter.year,
      startsAt,
      endsAt,
      status: "upcoming",
    });

    await currentUpcomingSeason.save({
      session: mongoSession,
    });
  }
  return {
    activeSeason: currentActiveSeason,
    upcomingSeason: currentUpcomingSeason,
  };
};

export const reconcileSeasons = async () => {
  const mongoSession = await mongoose.startSession();

  try {
    mongoSession.startTransaction();

    const now = new Date();

    let {
      activeSeason,

      upcomingSeason,
    } = await initializeSeasons(mongoSession);

    while (activeSeason.endsAt <= now) {
      const winningFaction = await getSeasonWinningFaction(
        activeSeason._id,

        mongoSession,
      );

      activeSeason.winningFaction = winningFaction;

      activeSeason.status = "completed";

      await activeSeason.save({
        session: mongoSession,
      });

      upcomingSeason.status = "active";

      await upcomingSeason.save({
        session: mongoSession,
      });

      activeSeason = upcomingSeason;

      const nextQuarter = getNextQuarter({
        year: activeSeason.year,

        quarter: activeSeason.quarter,
      });

      const latestSeason = await Season.findOne()

        .sort({
          seasonNumber: -1,
        })

        .session(mongoSession);

      const nextSeasonNumber = latestSeason.seasonNumber + 1;

      const startsAt = getQuarterStartDate(
        nextQuarter.year,

        nextQuarter.quarter,
      );

      const endsAt = getQuarterEndDate(
        nextQuarter.year,

        nextQuarter.quarter,
      );

      upcomingSeason = new Season({
        seasonNumber: nextSeasonNumber,

        quarter: nextQuarter.quarter,

        year: nextQuarter.year,

        startsAt,

        endsAt,

        status: "upcoming",
      });

      await upcomingSeason.save({
        session: mongoSession,
      });
    }

    await mongoSession.commitTransaction();

    return {
      activeSeason,
      upcomingSeason,
    };
  } catch (error) {
    if (mongoSession.inTransaction()) {
      await mongoSession.abortTransaction();
    }

    throw error;
  } finally {
    await mongoSession.endSession();
  }
};

export const getSeasonWinningFaction = async (
  seasonId,
  mongoSession = null,
) => {
  const results = await SeasonContribution.aggregate([
    {
      $match: {
        season: seasonId,
      },
    },

    {
      $group: {
        _id: "$faction",

        totalXP: {
          $sum: "$xp",
        },
      },
    },

    {
      $sort: {
        totalXP: -1,

        _id: 1,
      },
    },

    {
      $limit: 1,
    },
  ]).session(mongoSession);

  if (results.length === 0) {
    return null;
  }

  return results[0]._id;
};

export const getCurrentSeasonStandings = async () => {
  const now = new Date();

  const activeSeason = await Season.findOne({
    status: "active",
    startsAt: {
      $lte: now,
    },
    endsAt: {
      $gt: now,
    },
  });

  if (!activeSeason) {
    return null;
  }

  const contributionTotals = await SeasonContribution.aggregate([
    {
      $match: {
        season: activeSeason._id,
      },
    },

    {
      $group: {
        _id: "$faction",

        totalXP: {
          $sum: "$xp",
        },
      },
    },
  ]);

  const factions = await Faction.find().lean();

  const xpByFaction = new Map(
    contributionTotals.map((entry) => [entry._id.toString(), entry.totalXP]),
  );

  const standings = factions.map((faction) => ({
    faction: {
      id: faction._id,
      name: faction.name,
    },
    totalXP: xpByFaction.get(faction._id.toString()) ?? 0,
  }));

  standings.sort((a, b) => {
    if (b.totalXP !== a.totalXP) {
      return b.totalXP - a.totalXP;
    }

    return a.faction.id.toString().localeCompare(b.faction.id.toString());
  });

  const rankedStandings = standings.map((standing, index) => ({
    rank: index + 1,
    ...standing,
  }));
  return {
    season: activeSeason,
    standings: rankedStandings,
  };
};

export const getCurrentSeason = async () => {
  const now = new Date();

  const activeSeason = await Season.findOne({
    status: "active",
    startsAt: {
      $lte: now,
    },
    endsAt: {
      $gt: now,
    },
  });

  if (!activeSeason) {
    return null;
  }

  return activeSeason;
};

export const getSeasonHistory = async ({ page = 1, limit = 1 }) => {
  const skip = (page - 1) * limit;

  const query = {
    status: "completed",
  };

  const seasons = await Season.find(query)
    .sort({ seasonNumber: -1 })
    .populate("winningFaction name")
    .skip(skip)
    .limit(limit)
    .lean({ virtuals: true });

  const totalSeasons = await Season.countDocuments(query);

  const totalPages = Math.ceil(totalSeasons / limit);

  return {
    seasons,
    pagination: {
      page,
      limit,
      totalSeasons,
      totalPages,
    },
  };
};

export const getSeasonById = async (seasonId) => {
  const season = await Season.findById(seasonId).populate(
    "winningFaction",
    "name",
  );

  if (!season) {
    return null;
  }

  const contributionTotals = await SeasonContribution.aggregate([
    {
      $match: {
        season: season._id,
      },
    },
    {
      $group: {
        _id: "$faction",
        totalXP: {
          $sum: "$xp",
        },
      },
    },
  ]);

  const factions = await Faction.find().lean();

  const xpByFaction = new Map(
    contributionTotals.map((entry) => [entry._id.toString(), entry.totalXP]),
  );

  const standings = factions.map((faction) => ({
    faction: {
      id: faction._id,
      name: faction.name,
    },
    totalXP: xpByFaction.get(faction._id.toString()) ?? 0,
  }));

  standings.sort((a, b) => {
    if (b.totalXP !== a.totalXP) {
      return b.totalXP - a.totalXP;
    }

    return a.faction.id.toString().localeCompare(b.faction.id.toString());
  });

  const rankedStandings = standings.map((standing, index) => ({
    rank: index + 1,
    ...standing,
  }));

  return {
    season,
    standings: rankedStandings,
  };
};
