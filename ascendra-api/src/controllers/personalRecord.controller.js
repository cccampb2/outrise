import {
  getCurrentPersonalRecords,
  getPersonalRecordHistory,
} from "../services/personalRecord.service.js";

export const getCurrentPersonalRecordsController = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const personalRecords = await getCurrentPersonalRecords({ userId });

    return res.status(200).json({ personalRecords });
  } catch (error) {
    next(error);
  }
};

export const getCurrentPersonalRecordHistoryController = async (
  req,
  res,
  next,
) => {
  try {
    const userId = req.user.userId;

    const { exerciseId } = req.params;

    const { page, limit, distanceMiles } = req.query;

    const result = await getPersonalRecordHistory({
      userId,
      exerciseId,
      page,
      limit,
      distanceMiles,
    });

    return res.status(200).json({
      personalRecords: result.personalRecords,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};
