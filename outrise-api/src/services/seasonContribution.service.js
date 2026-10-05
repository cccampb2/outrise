import { canAccessAccount } from "../constants/accountStatus.js";
import Season from "../models/Season.js";
import SeasonContribution from "../models/SeasonContribution.js";
import User from "../models/User.js";
import mongoose from "mongoose";
import {
  getFactionActivityStandings,
  recordFactionSeasonChanges,
} from "./factionActivity.service.js";

export const addSeasonContribution = async ({
  userId,
  amount,
  mongoSession = null,
}) => {
  if (!Number.isInteger(amount) || amount <= 0) {
    return null;
  }
  if (!mongoSession) {
    const session = await mongoose.startSession();
    try {
      return await session.withTransaction(() =>
        addSeasonContribution({ userId, amount, mongoSession: session }),
      );
    } finally {
      await session.endSession();
    }
  }

  const now = new Date();

  const activeSeason = await Season.findOne({
    status: "active",
    startsAt: {
      $lte: now,
    },
    endsAt: {
      $gt: now,
    },
  }).session(mongoSession);

  if (!activeSeason) {
    return null;
  }

  const user = await User.findById(userId)
    .select("faction accountStatus")
    .session(mongoSession);

  if (!user || !canAccessAccount(user.accountStatus) || !user.faction) {
    return null;
  }
  // Serialize faction score changes so concurrent awards cannot invent rank transitions.
  const season = await Season.findOneAndUpdate(
    { _id: activeSeason._id, status: "active" },
    { $inc: { activityRevision: 1 } },
    { returnDocument: "after", session: mongoSession },
  );
  if (!season) {
    return null;
  }
  const before = await getFactionActivityStandings(season._id, mongoSession);
  const contribution = await SeasonContribution.findOneAndUpdate(
    {
      season: activeSeason._id,
      user: user._id,
    },
    {
      $inc: {
        xp: amount,
      },
      $setOnInsert: {
        faction: user.faction,
      },
    },
    {
      upsert: true,
      returnDocument: "after",
      runValidators: true,
      session: mongoSession,
    },
  );

  await recordFactionSeasonChanges({ season, before, mongoSession });
  return contribution;
};
