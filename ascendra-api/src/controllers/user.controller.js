import mongoose from "mongoose";
import User from "../models/User.js";
import NotFoundError from "../errors/NotFoundError.js";
import { getProgressFromXP } from "../utils/progression.js";
import { getUserGlobalRank } from "../services/leaderboard.service.js";

export const getCurrentUser = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const user = await User.findById(userId);

    if (!user) {
      throw new NotFoundError("User not found");
    }

    const progression = getProgressFromXP(user.lifetimeXP ?? 0);

    const ranking = await getUserGlobalRank(user.id);

    res.status(200).json({
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      accountStatus: user.accountStatus,
      faction: user.faction,
      lifetimeXP: user.lifetimeXP,
      totalWorkouts: user.totalWorkouts,
      createdAt: user.createdAt,
      progression,
      ranking,
    });
  } catch (error) {
    next(error);
  }
};

export const getPublicUser = async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!mongoose.isValidObjectId(userId)) {
      throw new NotFoundError("User not found");
    }

    const user = await User.findOne({
      _id: userId,
      accountStatus: "active",
    })
      .select("username faction lifetimeXP totalWorkouts createdAt")
      .populate("faction", "name slug colors")
      .lean();

    if (!user) {
      throw new NotFoundError("User not found");
    }

    const progression = getProgressFromXP(user.lifetimeXP ?? 0);

    const ranking = await getUserGlobalRank(user._id);

    res.status(200).json({
      user: {
        id: user._id,
        username: user.username,
        faction: user.faction,
        lifetimeXP: user.lifetimeXP ?? 0,
        totalWorkouts: user.totalWorkouts ?? 0,
        createdAt: user.createdAt,
        progression,
        ranking,
      },
    });
  } catch (error) {
    next(error);
  }
};
