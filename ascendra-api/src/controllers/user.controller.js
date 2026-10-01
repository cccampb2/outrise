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
      firstName: user.firstName,
      lastName: user.lastName,
      nameVisibility: user.nameVisibility,
      bio: user.bio,
      profileImage: user.profileImage,
    });
  } catch (error) {
    next(error);
  }
};

export const searchUsers = async (req, res, next) => {
  try {
    const query =
      typeof req.query.query === "string" ? req.query.query.trim() : "";

    const requestedPage = Number.parseInt(req.query.page, 10);
    const requestedLimit = Number.parseInt(req.query.limit, 10);

    const page =
      Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;

    const limit =
      Number.isInteger(requestedLimit) && requestedLimit > 0
        ? Math.min(requestedLimit, 50)
        : 25;

    if (!query) {
      return res.status(200).json({
        users: [],
        pagination: {
          page,
          limit,
          totalUsers: 0,
          totalPages: 0,
        },
      });
    }

    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const filter = {
      accountStatus: "active",
      username: {
        $regex: escapedQuery,
        $options: "i",
      },
    };

    const skip = (page - 1) * limit;

    const [users, totalUsers] = await Promise.all([
      User.find(filter)
        .select("username faction lifetimeXP")
        .populate("faction", "name slug colors")
        .sort({ username: 1, _id: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      User.countDocuments(filter),
    ]);

    const searchResults = users.map((user) => {
      const progression = getProgressFromXP(user.lifetimeXP ?? 0);

      return {
        id: user._id,
        username: user.username,
        faction: user.faction,
        lifetimeXP: user.lifetimeXP ?? 0,
        progression: {
          level: progression.level,
          echelon: progression.echelon,
        },
      };
    });

    res.status(200).json({
      users: searchResults,
      pagination: {
        page,
        limit,
        totalUsers,
        totalPages: Math.ceil(totalUsers / limit),
      },
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
      .select(
        "username faction lifetimeXP totalWorkouts firstName lastName nameVisibility bio profileImage createdAt",
      )
      .populate("faction", "name slug colors")
      .lean();

    if (!user) {
      throw new NotFoundError("User not found");
    }

    const progression = getProgressFromXP(user.lifetimeXP ?? 0);

    const ranking = await getUserGlobalRank(user._id);

    const isOwnProfile = req.user.userId === user._id.toString();

    const canViewName = isOwnProfile || user.nameVisibility === "public";

    res.status(200).json({
      user: {
        id: user._id,
        username: user.username,

        firstName: canViewName ? user.firstName : null,
        lastName: canViewName ? user.lastName : null,

        bio: user.bio,
        profileImage: user.profileImage,

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

export const updateCurrentUser = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const allowedUpdates = ["firstName", "lastName", "nameVisibility", "bio"];

    const updates = {};

    for (const field of allowedUpdates) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const user = await User.findByIdAndUpdate(
      userId,
      {
        $set: updates,
      },
      {
        returnDocument: "after",
        runValidators: true,
      },
    );

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
      firstName: user.firstName,
      lastName: user.lastName,
      nameVisibility: user.nameVisibility,
      bio: user.bio,
      profileImage: user.profileImage,
      createdAt: user.createdAt,
      progression,
      ranking,
    });
  } catch (error) {
    next(error);
  }
};
