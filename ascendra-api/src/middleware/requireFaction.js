import User from "../models/User.js";
import ForbiddenError from "../errors/ForbiddenError.js";
import NotFoundError from "../errors/NotFoundError.js";

export const requireFaction = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId);

    if (!user) {
      throw new NotFoundError("User not found");
    }

    if (!user.faction) {
      throw new ForbiddenError("Faction confirmation required");
    }

    next();
  } catch (error) {
    next(error);
  }
};
