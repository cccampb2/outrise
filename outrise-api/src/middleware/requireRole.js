import ForbiddenError from "../errors/ForbiddenError.js";
import { hasAdminAccess } from "../constants/userRoles.js";

export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      const userRole = req.user.role;

      const hasPermission = allowedRoles.includes(userRole) ||
        (allowedRoles.includes("admin") && hasAdminAccess(userRole));

      if (!hasPermission) {
        throw new ForbiddenError(
          "You do not have permission to perform this action",
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
