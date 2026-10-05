import {
  listAdminAchievements,
  getAdminAchievement,
  createAdminAchievement,
  updateAdminAchievement,
  setAchievementStatus,
} from "../services/adminAchievement.service.js";

export const listAchievementsController = async (req, res, next) => {
  try {
    const result = await listAdminAchievements(req.query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getAchievementController = async (req, res, next) => {
  try {
    const achievement = await getAdminAchievement(req.params.id);
    res.status(200).json({ achievement });
  } catch (error) {
    next(error);
  }
};

export const createAchievementController = async (req, res, next) => {
  try {
    const achievement = await createAdminAchievement(req.body);
    res.status(201).json({ achievement });
  } catch (error) {
    next(error);
  }
};

export const updateAchievementController = async (req, res, next) => {
  try {
    const achievement = await updateAdminAchievement(req.params.id, req.body);
    res.status(200).json({ achievement });
  } catch (error) {
    next(error);
  }
};

export const achievementStatusController = async (req, res, next) => {
  try {
    const achievement = await setAchievementStatus(
      req.params.id,
      req.body.isActive,
    );
    res.status(200).json({ achievement });
  } catch (error) {
    next(error);
  }
};
