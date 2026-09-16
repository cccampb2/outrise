import bcrypt from "bcrypt";
import User from "../models/User.js";
import ConflictError from "../errors/ConflictError.js";
import UnauthorizedError from "../errors/UnauthorizedError.js";

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
  return user;
};

export const loginUser = async ({ email, password }) => {
  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const passwordMatches = await bcrypt.compare(password, user.password);

  if (!passwordMatches) {
    throw new UnauthorizedError("Invalid email or password");
  }

  return user;
};
