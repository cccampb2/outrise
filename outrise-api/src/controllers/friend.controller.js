import {
  acceptFriendRequest,
  cancelFriendRequest,
  declineFriendRequest,
  getFriends,
  getIncomingFriendRequests,
  getOutgoingFriendRequests,
  removeFriend,
  sendFriendRequest,
} from "../services/friend.service.js";

export const getFriendsController = async (req, res, next) => {
  try {
    const result = await getFriends({
      userId: req.user.userId,
      page: req.query.page,
      limit: req.query.limit,
    });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getIncomingFriendRequestsController = async (req, res, next) => {
  try {
    const result = await getIncomingFriendRequests({
      userId: req.user.userId,
      page: req.query.page,
      limit: req.query.limit,
    });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getOutgoingFriendRequestsController = async (req, res, next) => {
  try {
    const result = await getOutgoingFriendRequests({
      userId: req.user.userId,
      page: req.query.page,
      limit: req.query.limit,
    });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const removeFriendController = async (req, res, next) => {
  try {
    await removeFriend({
      userId: req.user.userId,
      friendId: req.params.userId,
    });

    res.status(204).end();
  } catch (error) {
    next(error);
  }
};

export const cancelFriendRequestController = async (req, res, next) => {
  try {
    await cancelFriendRequest({
      userId: req.user.userId,
      requestId: req.params.requestId,
    });

    res.status(204).end();
  } catch (error) {
    next(error);
  }
};

export const declineFriendRequestController = async (req, res, next) => {
  try {
    await declineFriendRequest({
      userId: req.user.userId,
      requestId: req.params.requestId,
    });

    res.status(204).end();
  } catch (error) {
    next(error);
  }
};

export const acceptFriendRequestController = async (req, res, next) => {
  try {
    const friendship = await acceptFriendRequest({
      userId: req.user.userId,
      requestId: req.params.requestId,
    });

    res.status(200).json({ friendship });
  } catch (error) {
    next(error);
  }
};

export const sendFriendRequestController = async (req, res, next) => {
  try {
    const requesterId = req.user.userId;
    const { userId: recipientId } = req.params;

    const friendship = await sendFriendRequest({
      requesterId,
      recipientId,
    });

    res.status(201).json({
      friendship,
    });
  } catch (error) {
    next(error);
  }
};
