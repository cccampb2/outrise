import bcrypt from "bcrypt";
import logger from "../utils/logger.js";
import { requestEmailVerification } from "./emailVerification.service.js";
import User from "../models/User.js";
import ConflictError from "../errors/ConflictError.js";
import UnauthorizedError from "../errors/UnauthorizedError.js";
import { ensureAccountAccess } from "./accountAccess.service.js";

export const registerUser = async ({ username, email, password }) => {
  const existingEmail = await User.findOne({ email });

  if (existingEmail) {
    throw new ConflictError("Email already in use");
  }

  const existingUsername = await User.findOne({ username });

  if (existingUsername) {
    throw new ConflictError("Username already in use");
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await User.create({
    username,
    email,
    password: hashedPassword,
  });
  try {
    await requestEmailVerification({ userId: user._id });
  } catch (error) {
    // The account already exists. Continue into the verification screen with a
    // session so the user can request another code without repeating signup.
    logger.warn("Initial verification email delivery could not be confirmed.",
      error.deliveryFailure || { reason: "EMAIL_CONFIGURATION" });
  }
  return user;
};

export const loginUser = async ({ email, password }) => {
  const user = await User.findOne({ email }).select("+password +tokenVersion");

  if (!user) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const passwordMatches = await bcrypt.compare(password, user.password);

  if (!passwordMatches) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const accessibleUser = await ensureAccountAccess(user);
  // Suspension restoration may return a fresh document with hidden fields omitted.
  accessibleUser.tokenVersion = user.tokenVersion ?? 0;
  return accessibleUser;
};
