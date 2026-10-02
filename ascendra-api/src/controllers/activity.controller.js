import {
  dismissActivityEvents,
  getActivityFeed,
} from "../services/activity.service.js";

export const dismissActivityEventsController = async (req, res, next) => {
  try {
    await dismissActivityEvents({
      userId: req.user.userId,
      eventIds: req.body.eventIds,
    });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};

export const getActivityFeedController = async (req, res, next) => {
  try {
    const result = await getActivityFeed({
      userId: req.user.userId,
      page: req.query.page,
      limit: req.query.limit,
    });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
