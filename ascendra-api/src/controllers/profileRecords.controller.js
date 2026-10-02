import {
  getProfileAchievements,
  getProfilePerformances,
} from "../services/profileRecords.service.js";

export const getProfileAchievementsController = async (req, res, next) => {
  try {
    const result = await getProfileAchievements({
      userId: req.params.userId,
      page: req.query.page,
      limit: req.query.limit,
      view: req.query.view,
    });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getProfilePerformancesController = async (req, res, next) => {
  try {
    const result = await getProfilePerformances({
      userId: req.params.userId,
      page: req.query.page,
      limit: req.query.limit,
    });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
