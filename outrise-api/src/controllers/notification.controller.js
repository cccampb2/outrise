import {
  getNotifications,
  getUnreadNotificationCount,
  updateNotificationState,
} from "../services/notification.service.js";

export const getNotificationsController = async (req, res, next) => {
  try {
    const result = await getNotifications({
      userId: req.user.userId,
      ...req.query,
    });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getUnreadCountController = async (req, res, next) => {
  try {
    const result = await getUnreadNotificationCount(req.user.userId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const markNotificationsReadController = async (req, res, next) => {
  try {
    await updateNotificationState({ userId: req.user.userId, ...req.body });
    req.app
      .get("io")
      ?.to(`user:${req.user.userId}`)
      .emit("notifications:updated");
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const dismissNotificationsController = async (req, res, next) => {
  try {
    await updateNotificationState({
      userId: req.user.userId,
      ...req.body,
      dismiss: true,
    });
    req.app
      .get("io")
      ?.to(`user:${req.user.userId}`)
      .emit("notifications:updated");
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
