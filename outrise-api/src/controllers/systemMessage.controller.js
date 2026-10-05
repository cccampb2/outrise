import {
  publishSystemMessage,
  getSystemMessages,
  getSystemMessage,
  getSystemMessageSummary,
  getUnreadSystemMessageCount,
  markSystemMessagesRead,
} from "../services/systemMessage.service.js";

export const publishSystemMessageController = async (req, res, next) => {
  try {
    const result = await publishSystemMessage({
      userId: req.user.userId,
      ...req.body,
    });
    if (result.created) {
      req.app
        .get("io")
        ?.emit("announcement:new", { messageId: result.systemMessage._id });
    }
    res.status(result.created ? 201 : 200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getSystemMessagesController = async (req, res, next) => {
  try {
    const result = await getSystemMessages({
      userId: req.user.userId,
      ...req.query,
    });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getOwnerSystemMessagesController = async (req, res, next) => {
  try {
    const result = await getSystemMessages({
      userId: req.user.userId,
      ...req.query,
      ownerHistory: true,
    });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getSystemMessageController = async (req, res, next) => {
  try {
    const systemMessage = await getSystemMessage({
      userId: req.user.userId,
      messageId: req.params.messageId,
    });
    res.status(200).json({ systemMessage });
  } catch (error) {
    next(error);
  }
};

export const getSystemMessageSummaryController = async (req, res, next) => {
  try {
    const result = await getSystemMessageSummary(req.user.userId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getSystemMessageUnreadCountController = async (req, res, next) => {
  try {
    const result = await getUnreadSystemMessageCount(req.user.userId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const markSystemMessagesReadController = async (req, res, next) => {
  try {
    await markSystemMessagesRead({
      userId: req.user.userId,
      eventIds: req.body.eventIds,
    });
    req.app.get("io")?.to(`user:${req.user.userId}`).emit("announcements:read");
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
