import NotFoundError from "../errors/NotFoundError.js";
import {
  getCurrentSeasonStandings,
  getCurrentSeason,
  getSeasonHistory,
  getSeasonById,
} from "../services/season.service.js";

export const getCurrentSeasonStandingsController = async (req, res, next) => {
  try {
    const result = await getCurrentSeasonStandings();

    if (!result) {
      return res.status(200).json({
        season: null,
        standings: [],
      });
    }

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getCurrentSeasonController = async (req, res, next) => {
  try {
    const season = await getCurrentSeason();

    if (!season) {
      return res.status(200).json({
        season: null,
      });
    }

    return res.status(200).json({ season });
  } catch (error) {
    next(error);
  }
};

export const getSeasonHistoryController = async (req, res, next) => {
  try {
    const { page, limit } = req.query;

    const result = await getSeasonHistory({ page, limit });

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getSeasonByIdController = async (req, res, next) => {
  try {
    const { seasonId } = req.params;

    const result = await getSeasonById(seasonId);

    if (!result) {
      throw new NotFoundError("Season not found");
    }

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
