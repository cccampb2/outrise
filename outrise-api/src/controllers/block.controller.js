import {
  blockUser,
  unblockUser,
  getBlockedUsers,
  getBlockRelationship,
} from "../services/block.service.js";
function refreshContact(req) {
  req.app
    .get("io")
    ?.to(`user:${req.user.userId}`)
    .to(`user:${req.params.userId}`)
    .emit("contacts:updated");
}
export async function blockUserController(req, res, next) {
  try {
    await blockUser({
      userId: req.user.userId,
      otherUserId: req.params.userId,
    });
    refreshContact(req);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
export async function unblockUserController(req, res, next) {
  try {
    await unblockUser({
      userId: req.user.userId,
      otherUserId: req.params.userId,
    });
    refreshContact(req);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
export async function getBlockedUsersController(req, res, next) {
  try {
    const result = await getBlockedUsers({
      userId: req.user.userId,
      page: req.query.page,
      limit: req.query.limit,
    });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
export async function getBlockRelationshipController(req, res, next) {
  try {
    const result = await getBlockRelationship({
      userId: req.user.userId,
      otherUserId: req.params.userId,
    });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
