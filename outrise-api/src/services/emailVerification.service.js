import {
  randomBytes,
  randomInt,
  createHmac,
  timingSafeEqual,
} from "node:crypto";
import User from "../models/User.js";
import AppError from "../errors/AppError.js";
import BadRequestError from "../errors/BadRequestError.js";
import NotFoundError from "../errors/NotFoundError.js";
import {
  getEmailVerificationEmailConfig,
  sendEmailVerificationEmail,
} from "./email.service.js";

const EXPIRY_MINUTES = 10;
const RESEND_WAIT_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;
const REQUEST_MESSAGE =
  "A verification code has been sent. Check your inbox and spam folder.";
const VERIFIED_MESSAGE = "Your email is verified.";
const INVALID_CODE_MESSAGE =
  "Invalid or expired verification code. Request a new code if needed.";

function hashCode(email, verificationId, code) {
  if (!process.env.JWT_SECRET) {
    throw new AppError(
      "Email verification is not configured on the server.",
      503,
    );
  }
  // Bind the short code to its purpose, request and current account email. A
  // database copy alone cannot be used to guess the code without this secret.
  return createHmac("sha256", process.env.JWT_SECRET)
    .update(`email-verification:${verificationId}:${email}:${code}`)
    .digest("hex");
}

function verifiedResponse() {
  return {
    message: VERIFIED_MESSAGE,
    emailVerified: true,
    alreadyVerified: true,
  };
}

function requestResponse() {
  return {
    message: REQUEST_MESSAGE,
    emailVerified: false,
    expiresInMinutes: EXPIRY_MINUTES,
    resendAfterSeconds: 60,
  };
}

function enforceCooldown(user, now) {
  if (!(user.emailVerificationRequestedAt instanceof Date)) {
    return;
  }
  const remainingSeconds = Math.ceil(
    (user.emailVerificationRequestedAt.getTime() +
      RESEND_WAIT_MS -
      now.getTime()) /
      1000,
  );
  if (remainingSeconds <= 0) {
    return;
  }
  const error = new AppError(
    "Please wait before requesting another verification code.",
    429,
  );
  error.retryAfterSeconds = remainingSeconds;
  throw error;
}

export const requestEmailVerification = async ({ userId }) => {
  // The caller supplies the authenticated id. Email is read from this account,
  // never from request input, so one member cannot verify another member's email.
  const owner = await User.findOne({ _id: userId }).select(
    "email firstName username emailVerified +emailVerificationRequestedAt",
  );
  if (!owner) {
    throw new NotFoundError("Your account could not be found.");
  }
  if (owner.emailVerified === true) {
    return verifiedResponse();
  }

  const now = new Date();
  enforceCooldown(owner, now);
  getEmailVerificationEmailConfig();
  const code = String(randomInt(0, 1000000)).padStart(6, "0");
  const verificationId = randomBytes(16).toString("hex");
  const verification = {
    id: verificationId,
    codeHash: hashCode(owner.email, verificationId, code),
    expiresAt: new Date(now.getTime() + EXPIRY_MINUTES * 60 * 1000),
    attempts: 0,
  };
  // This conditional write applies the cooldown across servers. The email guard
  // also prevents a request prepared for an older address from replacing state.
  const user = await User.findOneAndUpdate(
    {
      _id: owner._id,
      email: owner.email,
      emailVerified: { $ne: true },
      $or: [
        { emailVerificationRequestedAt: { $exists: false } },
        { emailVerificationRequestedAt: null },
        {
          emailVerificationRequestedAt: {
            $lte: new Date(now.getTime() - RESEND_WAIT_MS),
          },
        },
      ],
    },
    {
      $set: {
        emailVerification: verification,
        emailVerificationRequestedAt: now,
      },
    },
    { returnDocument: "after", runValidators: true },
  ).select("email firstName username emailVerified");

  if (!user) {
    const current = await User.findOne({ _id: userId }).select(
      "emailVerified +emailVerificationRequestedAt",
    );
    if (!current) {
      throw new NotFoundError("Your account could not be found.");
    }
    if (current.emailVerified === true) {
      return verifiedResponse();
    }
    enforceCooldown(current, new Date());
    throw new BadRequestError(
      "Your verification request could not be completed. Please try again.",
    );
  }

  try {
    // This endpoint is authenticated, so awaiting delivery does not reveal which
    // emails have accounts. A timeout can happen after the provider accepted the
    // email; keep the saved code valid so a delivered message remains usable.
    await sendEmailVerificationEmail({
      to: user.email,
      recipientName: user.firstName || user.username || "there",
      code,
      expiresInMinutes: EXPIRY_MINUTES,
      verificationId,
    });
  } catch (error) {
    const failure = new AppError(
      "We could not confirm delivery of your verification email. Check your inbox and spam folder before requesting another code in one minute.",
      502,
    );
    failure.retryAfterSeconds = 60;
    if (error.deliveryFailure) {
      failure.deliveryFailure = error.deliveryFailure;
    }
    throw failure;
  }
  return requestResponse();
};

export const verifyEmail = async ({ userId, code }) => {
  if (typeof code !== "string" || !/^\d{6}$/.test(code)) {
    throw new BadRequestError(INVALID_CODE_MESSAGE);
  }
  const user = await User.findOne({ _id: userId }).select(
    "email emailVerified +emailVerification",
  );
  if (user?.emailVerified === true) {
    return verifiedResponse();
  }
  const verification = user?.emailVerification;
  if (
    !verification ||
    verification.expiresAt <= new Date() ||
    verification.attempts >= MAX_ATTEMPTS
  ) {
    throw new BadRequestError(INVALID_CODE_MESSAGE);
  }
  const candidate = Buffer.from(
    hashCode(user.email, verification.id, code),
    "hex",
  );
  const stored = Buffer.from(verification.codeHash, "hex");
  const claim = {
    _id: user._id,
    email: user.email,
    emailVerified: { $ne: true },
    "emailVerification.id": verification.id,
    "emailVerification.codeHash": verification.codeHash,
    "emailVerification.expiresAt": { $gt: new Date() },
    "emailVerification.attempts": { $lt: MAX_ATTEMPTS },
  };
  if (
    stored.length !== candidate.length ||
    !timingSafeEqual(candidate, stored)
  ) {
    // A stale attempt must never increment a newer request's guess counter.
    await User.updateOne(claim, { $inc: { "emailVerification.attempts": 1 } });
    throw new BadRequestError(INVALID_CODE_MESSAGE);
  }

  const updatedUser = await User.findOneAndUpdate(
    claim,
    { $set: { emailVerified: true }, $unset: { emailVerification: "" } },
    { returnDocument: "after", runValidators: true },
  ).select("emailVerified");
  if (!updatedUser) {
    // A concurrent successful verification is safe to report as success, while
    // a replaced/expired/exhausted request still fails without consuming it.
    const current = await User.findOne({ _id: userId }).select("emailVerified");
    if (current?.emailVerified === true) {
      return verifiedResponse();
    }
    throw new BadRequestError(INVALID_CODE_MESSAGE);
  }
  return { message: VERIFIED_MESSAGE, emailVerified: true };
};
