import bcrypt from "bcrypt";
import User from "../models/User.js";
import UnauthorizedError from "../errors/UnauthorizedError.js";
import { ensureAccountAccess } from "./accountAccess.service.js";
export { requestRegistration as registerUser } from "./registration.service.js";

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
