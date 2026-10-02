import User from "../models/User.js";
import Exercise from "../models/Exercise.js";
import NotFoundError from "../errors/NotFoundError.js";
import { createActivityEvent } from "./activity.service.js";

export async function recordVerificationActivity(verification, mongoSession) {
  const actor = await User.findById(verification.user).select("username").session(mongoSession);
  const exercise = await Exercise.findById(verification.exercise).select("name").session(mongoSession);
  if (!actor || !exercise) throw new NotFoundError("Verification user or exercise not found");
  await createActivityEvent({
    type: verification.status === "approved" ? "verification_approved" : "verification_rejected",
    actor: verification.user, audience: "personal", recipient: verification.user,
    sourceType: "verification", sourceId: verification._id,
    details: { actorUsername: actor.username, exerciseName: exercise.name },
    occurredAt: verification.reviewedAt,
    idempotencyKey: `verification:${verification._id}:${verification.status}`,
  }, { mongoSession });
}
