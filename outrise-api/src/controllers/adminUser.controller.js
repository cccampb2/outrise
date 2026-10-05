import {
  listAdminUsers,
  getAdminUser,
  setUserAccountStatus,
  setUserRole,
} from "../services/adminUser.service.js";

export const listAdminUsersController = async (req, res, next) => {
  try {
    const result = await listAdminUsers(req.query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getAdminUserController = async (req, res, next) => {
  try {
    const result = await getAdminUser(req.params.userId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const setUserAccountStatusController = async (req, res, next) => {
  try {
    const user = await setUserAccountStatus({
      userId: req.params.userId,
      adminId: req.user.userId,
      status: req.body.status,
      reason: req.body.reason,
      suspensionDays: req.body.suspensionDays,
    });
    res.status(200).json({ user });
  } catch (error) {
    next(error);
  }
};

export const setUserRoleController = async (req, res, next) => {
  try {
    const user = await setUserRole({
      userId: req.params.userId,
      ownerId: req.user.userId,
      role: req.body.role,
      expectedRole: req.body.expectedRole,
      reason: req.body.reason,
    });
    res.status(200).json({ user });
  } catch (error) {
    next(error);
  }
};
