import { randomBytes, randomInt, createHmac, timingSafeEqual } from "node:crypto";
import bcrypt from "bcrypt";
import User from "../models/User.js";
import AppError from "../errors/AppError.js";
import BadRequestError from "../errors/BadRequestError.js";
import logger from "../utils/logger.js";
import {
  getPasswordResetEmailConfig,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
} from "./email.service.js";

const EXPIRY_MINUTES = 10;
const RESEND_WAIT_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;
const REQUEST_MESSAGE = "If an account exists for that email, a reset code will be sent. Check your inbox and spam folder.";
const INVALID_CODE_MESSAGE = "Invalid or expired reset code. Request a new code if needed.";

function normalizeEmail(email) {
  if (typeof email !== "string" || !email.trim()) {
    throw new BadRequestError("Email is required.");
  }
  return email.trim().toLowerCase();
}

function hashCode(email, resetId, code) {
  if (!process.env.JWT_SECRET) {
    throw new AppError("Password reset is not configured on the server.", 503);
  }
  // A keyed hash protects six-digit codes from offline guesses against a DB copy.
  return createHmac("sha256", process.env.JWT_SECRET)
    .update(`password-reset:${resetId}:${email}:${code}`)
    .digest("hex");
}

export async function requestPasswordReset({ email }) {
  email = normalizeEmail(email);
  getPasswordResetEmailConfig();
  const code = String(randomInt(0, 1000000)).padStart(6, "0");
  const resetId = randomBytes(16).toString("hex");
  const now = new Date();
  const reset = {
    id: resetId,
    codeHash: hashCode(email, resetId, code),
    expiresAt: new Date(now.getTime() + EXPIRY_MINUTES * 60 * 1000),
    attempts: 0,
  };
  // One conditional write enforces the cooldown across requests/server processes.
  const user = await User.findOneAndUpdate(
    {
      email,
      $or: [
        { passwordResetRequestedAt: { $exists: false } },
        { passwordResetRequestedAt: null },
        { passwordResetRequestedAt: { $lte: new Date(now.getTime() - RESEND_WAIT_MS) } },
      ],
    },
    { $set: { passwordReset: reset, passwordResetRequestedAt: now } },
    { returnDocument: "after", runValidators: true },
  ).select("email firstName username");

  if (user) {
    // Do not wait for delivery in the HTTP response: Resend's latency must not
    // reveal whether an email belongs to an account. Never log the code or email.
    void sendPasswordResetEmail({
      to: user.email,
      recipientName: user.firstName || user.username || "there",
      code,
      expiresInMinutes: EXPIRY_MINUTES,
      resetId,
    }).catch((error) => {
      // A timeout may occur after Resend accepted the email. Keep the saved code
      // valid until expiry so a delivered message remains usable.
      logger.warn("Password reset email delivery could not be confirmed. Check Resend configuration.",
        error.deliveryFailure || { reason: "EMAIL_CONFIGURATION" });
    });
  }
  return { message: REQUEST_MESSAGE, expiresInMinutes: EXPIRY_MINUTES, resendAfterSeconds: 60 };
}

export async function resetPassword({ email, code, password, confirmPassword }) {
  email = normalizeEmail(email);
  if (typeof code !== "string" || !/^\d{6}$/.test(code)) {
    throw new BadRequestError(INVALID_CODE_MESSAGE);
  }
  if (typeof password !== "string" || password.length < 8 || Buffer.byteLength(password, "utf8") > 72) {
    throw new BadRequestError("Password must have at least 8 characters and be no more than 72 UTF-8 bytes.");
  }
  if (password !== confirmPassword) {
    throw new BadRequestError("Passwords must match.");
  }
  const user = await User.findOne({ email }).select("+passwordReset");
  const reset = user?.passwordReset;
  if (!reset || reset.expiresAt <= new Date() || reset.attempts >= MAX_ATTEMPTS) {
    throw new BadRequestError(INVALID_CODE_MESSAGE);
  }
  const candidate = Buffer.from(hashCode(email, reset.id, code), "hex");
  const stored = Buffer.from(reset.codeHash, "hex");
  if (stored.length !== candidate.length || !timingSafeEqual(candidate, stored)) {
    await User.updateOne(
      {
        _id: user._id,
        "passwordReset.id": reset.id,
        "passwordReset.expiresAt": { $gt: new Date() },
        "passwordReset.attempts": { $lt: MAX_ATTEMPTS },
      },
      { $inc: { "passwordReset.attempts": 1 } },
    );
    throw new BadRequestError(INVALID_CODE_MESSAGE);
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  // Consuming the code, changing the password and revoking tokens happen in one
  // atomic document update. Concurrent submissions cannot use the code twice.
  const updatedUser = await User.findOneAndUpdate(
    {
      _id: user._id,
      "passwordReset.id": reset.id,
      "passwordReset.codeHash": reset.codeHash,
      "passwordReset.expiresAt": { $gt: new Date() },
      "passwordReset.attempts": { $lt: MAX_ATTEMPTS },
    },
    {
      $set: { password: hashedPassword },
      $unset: { passwordReset: "" },
      $inc: { tokenVersion: 1 },
    },
    { returnDocument: "after", runValidators: true },
  ).select("email");
  if (!updatedUser) throw new BadRequestError(INVALID_CODE_MESSAGE);

  void sendPasswordChangedEmail({ to: updatedUser.email, resetId: reset.id })
    .catch((error) => logger.warn("Password change confirmation email could not be sent.",
      error.deliveryFailure || { reason: "EMAIL_CONFIGURATION" }));
  return { message: "Your password has been reset. Sign in with your new password." };
}
