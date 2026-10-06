import { getBlockRelationship } from "../services/block.service.js";
import {
  getOrCreateConversation,
  sendMessage,
  getConversationMessages,
  getConversations,
  getUnreadMessageCount,
  markConversationRead,
} from "../services/message.service.js";
import Conversation from "../models/Conversation.js";

export const getOrCreateConversationController = async (req, res, next) => {
  try {
    const conversation = await getOrCreateConversation({
      userId: req.user.userId,
      otherUserId: req.params.userId,
    });

    res.status(200).json({ conversation });
  } catch (error) {
    next(error);
  }
};

export const sendMessageController = async (req, res, next) => {
  try {
    const message = await sendMessage({
      userId: req.user.userId,
      conversationId: req.params.conversationId,
      text: req.body.text,
      idempotencyKey: req.body.idempotencyKey,
    });

    const conversation = await Conversation.findById(message.conversation)
      .select("userLow userHigh")
      .lean();

    const io = req.app.get("io");

    const blocking = conversation
      ? await getBlockRelationship({
          userId: conversation.userLow,
          otherUserId: conversation.userHigh,
        })
      : null;
    if (conversation && io && !blocking.blocked) {
      io.to(`user:${conversation.userLow}`)
        .to(`user:${conversation.userHigh}`)
        .emit("message:new", message.toObject());
    }

    res.status(200).json({ message });
  } catch (error) {
    next(error);
  }
};

export const getConversationMessagesController = async (req, res, next) => {
  try {
    const result = await getConversationMessages({
      userId: req.user.userId,
      conversationId: req.params.conversationId,
      page: req.query.page,
      limit: req.query.limit,
    });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getConversationsController = async (req, res, next) => {
  try {
    const result = await getConversations({
      userId: req.user.userId,
      page: req.query.page,
      limit: req.query.limit,
    });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getUnreadMessageCountController = async (req, res, next) => {
  try {
    const result = await getUnreadMessageCount(req.user.userId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const markConversationReadController = async (req, res, next) => {
  try {
    await markConversationRead({
      userId: req.user.userId,
      conversationId: req.params.conversationId,
      throughMessageId: req.body.throughMessageId,
    });
    req.app
      .get("io")
      ?.to(`user:${req.user.userId}`)
      .emit("messages:read", { conversationId: req.params.conversationId });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
