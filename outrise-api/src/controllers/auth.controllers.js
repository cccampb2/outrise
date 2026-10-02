import { registerUser, loginUser } from "../services/auth.services.js";
import jwt from "jsonwebtoken";
import { requestPasswordReset, resetPassword } from "../services/passwordReset.service.js";

export const register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    const user = await registerUser({ username, email, password });

    res.status(201).json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        faction: user.faction,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await loginUser({ email, password });

    const token = jwt.sign(
      { userId: user._id, role: user.role, tokenVersion: user.tokenVersion ?? 0 },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "7d",
      },
    );

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        faction: user.faction,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const result = await requestPasswordReset({ email: req.body.email });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const resetPasswordController = async (req, res, next) => {
  try {
    const { email, code, password, confirmPassword } = req.body;
    const result = await resetPassword({ email, code, password, confirmPassword });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
