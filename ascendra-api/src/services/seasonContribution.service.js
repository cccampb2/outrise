import Season from "../models/Season.js";
import SeasonContribution from "../models/SeasonContribution.js";
import User from "../models/User.js";

export const addSeasonContribution = async ({
  userId,
  amount,
  mongoSession = null,
}) => {
  if (!Number.isInteger(amount) || amount <= 0) {
    return null;
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

  if (!user || user.accountStatus !== "active" || !user.faction) {
    return null;
  }
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

  return contribution;
};
