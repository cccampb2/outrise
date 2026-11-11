import { randomBytes, createHmac, timingSafeEqual } from "node:crypto";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import RegistrationRequest from "../models/RegistrationRequest.js";
import RegistrationEmailLimit from "../models/RegistrationEmailLimit.js";
import User from "../models/User.js";
import { validateAgeEligibility } from "./ageEligibility.service.js";
import { validateLegalAcceptance } from "./legal.service.js";
import { ensureAccountAccess } from "./accountAccess.service.js";
import {
  getEmailVerificationEmailConfig,
  getAccountExistsEmailConfig,
  sendEmailVerificationEmail,
  sendAccountExistsEmail,
} from "./email.service.js";
import AppError from "../errors/AppError.js";
import BadRequestError from "../errors/BadRequestError.js";
import ConflictError from "../errors/ConflictError.js";
import logger from "../utils/logger.js";

const EXPIRY_MS = 10 * 60 * 1000;
const COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;
const PRIVATE_FIELDS =
  "+email +username +passwordHash +generation +codeHash +completedUser +completedTokenVersion";
const INVALID_CODE =
  "Invalid or expired registration code. Request a new code or restart registration.";
const message =
  "Check your email to continue. If this address already has an account, the email will explain how to sign in. Check your spam folder too.";

function digest(value) {
  if (!process.env.JWT_SECRET)
    throw new AppError("Registration is not configured on the server.", 503);
  return createHmac("sha256", process.env.JWT_SECRET)
    .update(value)
    .digest("hex");
}
function codeFor(requestId, generation) {
  // A random request/generation plus the server secret allows durable email retries
  // without storing the six-digit code in plaintext or logging it.
  const value = Buffer.from(
    digest(`registration-code:${requestId}:${generation}`),
    "hex",
  ).readUInt32BE(0);
  return String(value % 1000000).padStart(6, "0");
}
function hashCode(requestId, email, generation, code) {
  return digest(
    `registration-check:${requestId}:${email}:${generation}:${code}`,
  );
}
function response(requestId) {
  return { message, requestId, expiresInMinutes: 10, resendAfterSeconds: 60 };
}
function verificationFields(requestId, email, now) {
  const generation = randomBytes(16).toString("hex");
  return {
    generation,
    codeHash: hashCode(
      requestId,
      email,
      generation,
      codeFor(requestId, generation),
    ),
    attempts: 0,
    expiresAt: new Date(now.getTime() + EXPIRY_MS),
    requestedAt: now,
    state: "queued",
    deliveryKind: null,
    deliveryExpiresInMinutes: null,
    leaseToken: null,
    leaseUntil: null,
    nextAttemptAt: now,
    deliveryAttempts: 0,
  };
}
export async function requestRegistration({
  username,
  email,
  password,
  age,
  accepted,
  termsVersion,
  privacyVersion,
}) {
  validateAgeEligibility(age);
  validateLegalAcceptance({ accepted, termsVersion, privacyVersion });
  getEmailVerificationEmailConfig();
  getAccountExistsEmailConfig();
  email = email.trim().toLowerCase();
  const requestId = randomBytes(24).toString("hex");
  const passwordHash = await bcrypt.hash(password, 12);
  const now = new Date();
  // Deliberately do not query User or check username availability here. Every valid
  // registration takes the same path, whether or not an account already exists.
  await RegistrationRequest.create({
    requestId,
    email,
    username: username.trim(),
    passwordHash,
    ageEligibilityConfirmedAt: now,
    legalAcceptance: { acceptedAt: now, termsVersion, privacyVersion },
    ...verificationFields(requestId, email, now),
  });
  return response(requestId);
}

export async function resendRegistration({ requestId, email }) {
  getEmailVerificationEmailConfig();
  getAccountExistsEmailConfig();
  email = email.trim().toLowerCase();
  const now = new Date();
  await RegistrationRequest.updateOne(
    {
      requestId,
      email,
      state: { $ne: "completed" },
      requestedAt: { $lte: new Date(now.getTime() - COOLDOWN_MS) },
    },
    { $set: verificationFields(requestId, email, now), $inc: { revision: 1 } },
    { runValidators: true },
  );
  // Missing requests, cooldowns, and all delivery outcomes have the same response.
  return response(requestId);
}

export async function confirmRegistration({ requestId, email, code }) {
  email = email.trim().toLowerCase();
  if (!/^\d{6}$/.test(code)) throw new BadRequestError(INVALID_CODE);
  const draft = await RegistrationRequest.findOne({ requestId, email }).select(
    PRIVATE_FIELDS,
  );
  if (!draft || draft.expiresAt <= new Date() || draft.attempts >= MAX_ATTEMPTS)
    throw new BadRequestError(INVALID_CODE);
  const claim = {
    _id: draft._id,
    generation: draft.generation,
    email,
    expiresAt: { $gt: new Date() },
    attempts: { $lt: MAX_ATTEMPTS },
  };
  const candidate = Buffer.from(
    hashCode(requestId, email, draft.generation, code),
    "hex",
  );
  const stored = Buffer.from(draft.codeHash, "hex");
  if (
    candidate.length !== stored.length ||
    !timingSafeEqual(candidate, stored)
  ) {
    await RegistrationRequest.updateOne(claim, { $inc: { attempts: 1 } });
    throw new BadRequestError(INVALID_CODE);
  }
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(async () => {
      // Taking a write lock protects concurrent confirmation/resend and makes a
      // lost-response retry return only the account created by THIS request.
      const current = await RegistrationRequest.findOneAndUpdate(
        { ...claim, expiresAt: { $gt: new Date() } },
        { $inc: { revision: 1 } },
        { session, returnDocument: "after" },
      ).select(PRIVATE_FIELDS);
      if (!current) throw new BadRequestError(INVALID_CODE);
      if (current.completedUser) {
        const user = await User.findById(current.completedUser)
          .session(session)
          .select("+tokenVersion");
        if (
          !user ||
          user.email !== email ||
          (user.tokenVersion ?? 0) !== current.completedTokenVersion
        )
          throw new BadRequestError(INVALID_CODE);
        return ensureAccountAccess(user);
      }
      validateLegalAcceptance({
        accepted: true,
        termsVersion: current.legalAcceptance.termsVersion,
        privacyVersion: current.legalAcceptance.privacyVersion,
      });
      if (await User.findOne({ email }).session(session))
        throw new BadRequestError(INVALID_CODE);
      if (await User.findOne({ username: current.username }).session(session)) {
        throw new ConflictError(
          "That username is unavailable. Restart registration with another username.",
        );
      }
      const [user] = await User.create(
        [
          {
            username: current.username,
            email,
            password: current.passwordHash,
            emailVerified: true,
            ageEligibilityConfirmedAt: current.ageEligibilityConfirmedAt,
            legalAcceptance: {
              acceptedAt: current.legalAcceptance.acceptedAt,
              termsVersion: current.legalAcceptance.termsVersion,
              privacyVersion: current.legalAcceptance.privacyVersion,
            },
          },
        ],
        { session },
      );
      await RegistrationRequest.updateOne(
        { _id: current._id, generation: current.generation },
        {
          $set: {
            completedUser: user._id,
            completedTokenVersion: user.tokenVersion ?? 0,
            state: "completed",
            leaseToken: null,
            leaseUntil: null,
          },
        },
        { session },
      );
      return user;
    });
  } catch (error) {
    if (error.code === 11000) {
      // A separate registration may win either unique index between check/create.
      // Never surface duplicate-email details from MongoDB.
      throw new ConflictError(
        "Unable to finish registration. Try signing in or restart registration with another username.",
      );
    }
    throw error;
  } finally {
    await session.endSession();
  }
}

async function claimEmailCooldown(email, generation, now) {
  const emailKey = digest(`registration-mail-limit:${email}`);
  try {
    const claimed = await RegistrationEmailLimit.findOneAndUpdate(
      {
        emailKey,
        $or: [
          { requestedAt: { $lte: new Date(now.getTime() - COOLDOWN_MS) } },
          { generation },
        ],
      },
      {
        $set: {
          requestedAt: now,
          generation,
          expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        },
      },
      {
        upsert: true,
        returnDocument: "after",
        runValidators: true,
      },
    );
    return !!claimed;
  } catch (error) {
    if (error.code === 11000) return false;
    throw error;
  }
}

export async function processRegistrationEmail() {
  const now = new Date();
  const leaseToken = randomBytes(16).toString("hex");
  const draft = await RegistrationRequest.findOneAndUpdate(
    {
      expiresAt: { $gt: now },
      deliveryAttempts: { $lt: 3 },
      nextAttemptAt: { $lte: now },
      $or: [
        { state: "queued" },
        { state: "sending", leaseUntil: { $lte: now } },
      ],
    },
    {
      $set: {
        state: "sending",
        leaseToken,
        leaseUntil: new Date(now.getTime() + COOLDOWN_MS),
      },
      $inc: { deliveryAttempts: 1 },
    },
    {
      returnDocument: "after",
      sort: { nextAttemptAt: 1 },
    },
  ).select(PRIVATE_FIELDS + " +leaseToken");
  if (!draft) return false;
  const claim = {
    _id: draft._id,
    generation: draft.generation,
    state: "sending",
    leaseToken,
  };
  try {
    if (!draft.deliveryKind) {
      if (!(await claimEmailCooldown(draft.email, draft.generation, now))) {
        await RegistrationRequest.updateOne(claim, {
          $set: { state: "sent", leaseToken: null, leaseUntil: null },
        });
        return true;
      }
      const existing = await User.findOne({ email: draft.email }).select("_id");
      draft.deliveryKind = existing ? "existing" : "verification";
      draft.deliveryExpiresInMinutes = Math.max(
        1,
        Math.ceil((draft.expiresAt - now) / 60000),
      );
      const updated = await RegistrationRequest.updateOne(claim, {
        $set: {
          deliveryKind: draft.deliveryKind,
          deliveryExpiresInMinutes: draft.deliveryExpiresInMinutes,
        },
      });
      if (updated.matchedCount !== 1) return true;
    }
    if (draft.deliveryKind === "existing") {
      await sendAccountExistsEmail({
        to: draft.email,
        requestId: draft.generation,
      });
    } else {
      await sendEmailVerificationEmail({
        to: draft.email,
        recipientName: "there",
        code: codeFor(draft.requestId, draft.generation),
        expiresInMinutes: draft.deliveryExpiresInMinutes,
        verificationId: draft.generation,
      });
    }
    await RegistrationRequest.updateOne(claim, {
      $set: { state: "sent", leaseToken: null, leaseUntil: null },
    });
  } catch (error) {
    await RegistrationRequest.updateOne(claim, {
      $set: {
        state: "queued",
        leaseToken: null,
        leaseUntil: null,
        nextAttemptAt: new Date(Date.now() + COOLDOWN_MS),
      },
    });
    logger.warn(
      "Registration email delivery could not be confirmed.",
      error.deliveryFailure || { reason: "REGISTRATION_EMAIL_UNAVAILABLE" },
    );
  }
  return true;
}
