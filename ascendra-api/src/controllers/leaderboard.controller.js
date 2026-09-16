import {
  getZenithLeaderBoard,
  getGlobalLeaderboard,
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

    const result = await getGlobalLeaderboard({ page, limit });

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
