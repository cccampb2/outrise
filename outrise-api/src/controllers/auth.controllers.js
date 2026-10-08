import { hasCurrentLegalAcceptance } from "../services/legal.service.js";
import { registerUser, loginUser } from "../services/auth.services.js";
import jwt from "jsonwebtoken";
import { confirmAgeEligibility } from "../services/ageEligibility.service.js";
import {
  requestEmailVerification,
  verifyEmail,
} from "../services/emailVerification.service.js";
import {
  requestPasswordReset,
  resetPassword,
} from "../services/passwordReset.service.js";

const createSessionToken = (user) =>
  jwt.sign(
    { userId: user._id, role: user.role, tokenVersion: user.tokenVersion ?? 0 },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" },
  );

export const register = async (req, res, next) => {
  try {
    const {
      username,
      email,
      password,
      age,
      accepted,
      termsVersion,
      privacyVersion,
    } = req.body;

    const user = await registerUser({
      username,
      email,
      password,
      age,
      accepted,
      termsVersion,
      privacyVersion,
    });
    const token = createSessionToken(user);

    res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        emailVerified: user.emailVerified === true,
        ageEligibilityConfirmedAt: user.ageEligibilityConfirmedAt ?? null,
        ageEligibilityRejectedAt: user.ageEligibilityRejectedAt ?? null,
        legalAcceptance: user.legalAcceptance ?? null,
        legalAcceptanceRequired: !hasCurrentLegalAcceptance(user),
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

    const token = createSessionToken(user);

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        emailVerified: user.emailVerified === true,
        ageEligibilityConfirmedAt: user.ageEligibilityConfirmedAt ?? null,
        ageEligibilityRejectedAt: user.ageEligibilityRejectedAt ?? null,
        legalAcceptance: user.legalAcceptance ?? null,
        legalAcceptanceRequired: !hasCurrentLegalAcceptance(user),
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
    const result = await resetPassword({
      email,
      code,
      password,
      confirmPassword,
    });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const requestEmailVerificationController = async (req, res, next) => {
  try {
    const result = await requestEmailVerification({ userId: req.user.userId });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const verifyEmailController = async (req, res, next) => {
  try {
    const result = await verifyEmail({
      userId: req.user.userId,
      code: req.body.code,
    });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const confirmAgeEligibilityController = async (req, res, next) => {
  try {
    const result = await confirmAgeEligibility({
      userId: req.user.userId,
      age: req.body.age,
    });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
