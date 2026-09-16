import ForbiddenError from "../errors/ForbiddenError.js";

export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      const userRole = req.user.role;

      const hasPermission = allowedRoles.includes(userRole);

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
