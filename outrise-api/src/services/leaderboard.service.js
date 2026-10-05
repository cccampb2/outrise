import {
  ACCESSIBLE_ACCOUNT_STATUSES,
  canAccessAccount,
} from "../constants/accountStatus.js";
import User from "../models/User.js";
import { getProgressFromXP } from "../utils/progression.js";
import Faction from "../models/Faction.js";
import Season from "../models/Season.js";
import SeasonContribution from "../models/SeasonContribution.js";
import NotFoundError from "../errors/NotFoundError.js";
import Friendship from "../models/Friendship.js";

export const getFriendsLeaderboard = async ({
  userId,
  page = 1,
  limit = 25,
}) => {
  const friendships = await Friendship.find({
    status: "accepted",
    $or: [{ requester: userId }, { recipient: userId }],
  })
    .select("requester recipient")
    .lean();

  const participantIds = [
    userId,
    ...friendships.map((friendship) =>
      friendship.requester.toString() === userId.toString()
        ? friendship.recipient
        : friendship.requester,
    ),
  ];
  const filter = {
    _id: { $in: participantIds },
    accountStatus: { $in: ACCESSIBLE_ACCOUNT_STATUSES },
  };
  const skip = (page - 1) * limit;

  const [users, totalUsers, viewer] = await Promise.all([
    User.find(filter)
      .sort({ lifetimeXP: -1, _id: 1 })
      .skip(skip)
      .limit(limit)
      .select("username role lifetimeXP faction")
      .populate("faction", "name slug")
      .lean(),
    User.countDocuments(filter),
    User.findOne({
      _id: userId,
      accountStatus: { $in: ACCESSIBLE_ACCOUNT_STATUSES },
    })
      .select("username role lifetimeXP faction")
      .populate("faction", "name slug")
      .lean(),
  ]);

  function toRow(user, rank) {
    const progression = getProgressFromXP(user.lifetimeXP ?? 0);
    return {
      userId: user._id,
      username: user.username,
      role: user.role,
      lifetimeXP: user.lifetimeXP ?? 0,
      level: progression.level,
      echelon: progression.echelon,
      faction: user.faction,
      rank,
    };
  }

  let currentUser = null;
  if (viewer) {
    const usersAbove = await User.countDocuments({
      ...filter,
      $or: [
        { lifetimeXP: { $gt: viewer.lifetimeXP ?? 0 } },
        { lifetimeXP: viewer.lifetimeXP ?? 0, _id: { $lt: viewer._id } },
      ],
    });
    currentUser = toRow(viewer, usersAbove + 1);
  }

  return {
    leaderboard: users.map((user, index) => toRow(user, skip + index + 1)),
    currentUser,
    pagination: {
      page,
      limit,
      totalUsers,
      totalPages: Math.ceil(totalUsers / limit),
    },
  };
};

export const getFactionStandings = async () => {
  const now = new Date();

  const activeSeason = await Season.findOne({
    status: "active",
    startsAt: { $lte: now },
    endsAt: { $gt: now },
  }).lean();

  if (!activeSeason) {
    return {
      season: null,
      standings: [],
    };
  }

  const [factions, contributionTotals] = await Promise.all([
    Faction.find().select("name slug colors").lean(),

    SeasonContribution.aggregate([
      {
        $match: {
          season: activeSeason._id,
        },
      },
      {
        $group: {
          _id: "$faction",
          seasonXP: {
            $sum: "$xp",
          },
        },
      },
    ]),
  ]);

  const totalsByFaction = new Map(
    contributionTotals.map((total) => [total._id.toString(), total.seasonXP]),
  );

  const standings = factions
    .map((faction) => {
      return {
        faction: {
          _id: faction._id,
          name: faction.name,
          slug: faction.slug,
          colors: faction.colors,
        },
        seasonXP: totalsByFaction.get(faction._id.toString()) ?? 0,
      };
    })
    .sort((a, b) => {
      if (b.seasonXP !== a.seasonXP) {
        return b.seasonXP - a.seasonXP;
      }

      return a.faction._id.toString().localeCompare(b.faction._id.toString());
    })
    .map((standing, index) => {
      return {
        rank: index + 1,
        ...standing,
      };
    });

  return {
    season: {
      id: activeSeason._id,
      seasonNumber: activeSeason.seasonNumber,
      quarter: activeSeason.quarter,
      year: activeSeason.year,
      startsAt: activeSeason.startsAt,
      endsAt: activeSeason.endsAt,
    },
    standings,
  };
};

export const getZenithLeaderBoard = async () => {
  const users = await User.find({
    accountStatus: { $in: ACCESSIBLE_ACCOUNT_STATUSES },
    lifetimeXP: {
      $gt: 0,
    },
  })
    .sort({ lifetimeXP: -1, _id: 1 })
    .limit(25)
    .select("username role lifetimeXP faction")
    .lean();

  const leaderboard = users.map((user, index) => {
    const rank = index + 1;

    const progression = getProgressFromXP(user.lifetimeXP ?? 0);

    return {
      userId: user._id,
      username: user.username,
      role: user.role,
      lifetimeXP: user.lifetimeXP ?? 0,
      level: progression.level,
      echelon: progression.echelon,
      faction: user.faction,
      rank,
      zenithRank: rank,
    };
  });

  return leaderboard;
};

export const getGlobalLeaderboard = async ({ page, limit }) => {
  const skip = (page - 1) * limit;

  const query = {
    accountStatus: { $in: ACCESSIBLE_ACCOUNT_STATUSES },
    lifetimeXP: {
      $gt: 0,
    },
  };

  const users = await User.find(query)
    .sort({ lifetimeXP: -1, _id: 1 })
    .skip(skip)
    .limit(limit)
    .select("username role lifetimeXP faction")
    .populate("faction", "name slug")
    .lean();

  const totalUsers = await User.countDocuments(query);

  const totalPages = Math.ceil(totalUsers / limit);

  const leaderboard = users.map((user, index) => {
    const rank = skip + index + 1;
    const progression = getProgressFromXP(user.lifetimeXP ?? 0);

    return {
      userId: user._id,
      username: user.username,
      role: user.role,
      lifetimeXP: user.lifetimeXP ?? 0,
      level: progression.level,
      echelon: progression.echelon,
      faction: user.faction,
      rank,
      zenithRank: rank <= 25 ? rank : null,
    };
  });

  return {
    leaderboard,
    pagination: {
      page,
      limit,
      totalUsers,
      totalPages,
    },
  };
};

export const getUserGlobalRank = async (userId) => {
  const user = await User.findById(userId)
    .select("lifetimeXP accountStatus")
    .lean();

  if (!user || !canAccessAccount(user.accountStatus) || user.lifetimeXP <= 0) {
    return {
      globalRank: null,
      zenithRank: null,
    };
  }

  const usersAbove = await User.countDocuments({
    accountStatus: { $in: ACCESSIBLE_ACCOUNT_STATUSES },
    $or: [
      { lifetimeXP: { $gt: user.lifetimeXP } },
      { lifetimeXP: user.lifetimeXP, _id: { $lt: user._id } },
    ],
  });
  const globalRank = usersAbove + 1;
  const zenithRank = globalRank <= 25 ? globalRank : null;

  return { globalRank, zenithRank };
};

export const getCurrentUserLeaderboardPosition = async (userId) => {
  const user = await User.findOne({
    _id: userId,
    accountStatus: { $in: ACCESSIBLE_ACCOUNT_STATUSES },
    lifetimeXP: { $gt: 0 },
  })
    .select("username role lifetimeXP faction")
    .populate("faction", "name slug")
    .lean();

  if (!user) {
    return null;
  }

  const usersAbove = await User.countDocuments({
    accountStatus: { $in: ACCESSIBLE_ACCOUNT_STATUSES },
    $or: [
      { lifetimeXP: { $gt: user.lifetimeXP } },
      { lifetimeXP: user.lifetimeXP, _id: { $lt: user._id } },
    ],
  });

  const rank = usersAbove + 1;

  const progression = getProgressFromXP(user.lifetimeXP ?? 0);

  return {
    userId: user._id,
    username: user.username,
    role: user.role,
    lifetimeXP: user.lifetimeXP ?? 0,
    level: progression.level,
    echelon: progression.echelon,
    faction: user.faction,
    rank,
    zenithRank: rank <= 25 ? rank : null,
  };
};

export const getFactionLeaderboard = async ({
  factionSlug,
  userId,
  page,
  limit,
}) => {
  const faction = await Faction.findOne({
    slug: factionSlug,
  })
    .select("name slug description motto tagline values colors")
    .lean();

  if (!faction) {
    throw new NotFoundError("Faction not found");
  }

  const factionStandings = await getFactionStandings();

  if (!factionStandings.season) {
    return {
      season: null,
      faction: {
        _id: faction._id,
        name: faction.name,
        slug: faction.slug,
        description: faction.description,
        motto: faction.motto,
        tagline: faction.tagline,
        values: faction.values,
        colors: faction.colors,
      },
      factionStanding: null,
      currentUser: null,
      leaderboard: [],
      pagination: {
        page,
        limit,
        totalUsers: 0,
        totalPages: 0,
      },
    };
  }

  const activeSeasonId = factionStandings.season.id;

  const factionStanding =
    factionStandings.standings.find(
      (standing) => standing.faction._id.toString() === faction._id.toString(),
    ) ?? null;

  const skip = (page - 1) * limit;

  const contributionQuery = {
    season: activeSeasonId,
    faction: faction._id,
    xp: { $gt: 0 },
  };

  const [contributions, totalUsers, currentUserContribution] =
    await Promise.all([
      SeasonContribution.find(contributionQuery)
        .sort({
          xp: -1,
          user: 1,
        })
        .skip(skip)
        .limit(limit)
        .populate("user", "username role accountStatus")
        .lean(),

      SeasonContribution.countDocuments(contributionQuery),

      SeasonContribution.findOne({
        season: activeSeasonId,
        faction: faction._id,
        user: userId,
        xp: { $gt: 0 },
      })
        .populate("user", "username role accountStatus")
        .lean(),
    ]);

  const leaderboard = contributions
    .filter(
      (contribution) =>
        contribution.user && canAccessAccount(contribution.user.accountStatus),
    )
    .map((contribution, index) => {
      return {
        userId: contribution.user._id,
        username: contribution.user.username,
        role: contribution.user.role,
        seasonXP: contribution.xp,
        rank: skip + index + 1,
      };
    });

  let currentUser = null;

  if (
    currentUserContribution &&
    currentUserContribution.user &&
    canAccessAccount(currentUserContribution.user.accountStatus)
  ) {
    const usersAbove = await SeasonContribution.countDocuments({
      season: activeSeasonId,
      faction: faction._id,
      xp: { $gt: 0 },
      $or: [
        {
          xp: {
            $gt: currentUserContribution.xp,
          },
        },
        {
          xp: currentUserContribution.xp,
          user: {
            $lt: currentUserContribution.user._id,
          },
        },
      ],
    });

    currentUser = {
      userId: currentUserContribution.user._id,
      username: currentUserContribution.user.username,
      role: currentUserContribution.user.role,
      seasonXP: currentUserContribution.xp,
      rank: usersAbove + 1,
    };
  }

  const totalPages = Math.ceil(totalUsers / limit);

  return {
    season: factionStandings.season,

    faction: {
      _id: faction._id,
      name: faction.name,
      slug: faction.slug,
      description: faction.description,
      motto: faction.motto,
      tagline: faction.tagline,
      values: faction.values,
      colors: faction.colors,
    },

    factionStanding: factionStanding
      ? {
          rank: factionStanding.rank,
          seasonXP: factionStanding.seasonXP,
        }
      : null,

    currentUser,

    leaderboard,

    pagination: {
      page,
      limit,
      totalUsers,
      totalPages,
    },
  };
};
