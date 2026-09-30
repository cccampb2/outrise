import {
  getZenithLeaderBoard,
  getGlobalLeaderboard,
  getCurrentUserLeaderboardPosition,
  getFactionStandings,
  getFactionLeaderboard,
} from "../services/leaderboard.service.js";

export const getZenithLeaderBoardController = async (req, res, next) => {
  try {
    const leaderboard = await getZenithLeaderBoard();
    return res.status(200).json({ leaderboard });
  } catch (error) {
    next(error);
  }
};

export const getGlobalLeaderboardController = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const userId = req.user.userId;

    const [result, currentUser] = await Promise.all([
      getGlobalLeaderboard({ page, limit }),
      getCurrentUserLeaderboardPosition(userId),
    ]);

    return res.status(200).json({
      ...result,
      currentUser,
    });
  } catch (error) {
    next(error);
  }
};

export const getFactionStandingsController = async (req, res, next) => {
  try {
    const result = await getFactionStandings();

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getFactionLeaderboardController = async (req, res, next) => {
  try {
    const { factionSlug } = req.params;
    const { page, limit } = req.query;
    const userId = req.user.userId;

    const result = await getFactionLeaderboard({
      factionSlug,
      userId,
      page,
      limit,
    });

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
