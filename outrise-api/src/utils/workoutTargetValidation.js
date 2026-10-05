import BadRequestError from "../errors/BadRequestError.js";

const allowedTargetFields = {
  weight_reps: ["sets", "reps", "weightLbs"],

  reps: ["sets", "reps"],

  time: ["timeSeconds"],

  distance_time: ["distanceMiles", "timeSeconds"],

  duration: ["timeSeconds"],
  intervals: ["workSeconds", "recoverySeconds", "rounds"],
};

export const validateWorkoutTarget = ({
  measurementType,
  target,
  exerciseName,
}) => {
  const allowedFields = allowedTargetFields[measurementType];

  if (!allowedFields) {
    throw new BadRequestError(
      `${exerciseName} has an unsupported measurement type`,
    );
  }

  const providedFields = Object.keys(target);

  const invalidField = providedFields.find(
    (field) => !allowedFields.includes(field),
  );

  if (invalidField) {
    throw new BadRequestError(
      `${invalidField} is not valid for ${exerciseName}`,
    );
  }

  if (measurementType === "weight_reps" || measurementType === "reps") {
    if (target.sets === undefined) {
      throw new BadRequestError(`${exerciseName} requires sets`);
    }

    if (target.reps === undefined) {
      throw new BadRequestError(`${exerciseName} requires reps`);
    }

    return;
  }

  if (measurementType === "time") {
    if (target.timeSeconds === undefined) {
      throw new BadRequestError(`${exerciseName} requires a target time`);
    }

    return;
  }

  if (measurementType === "distance_time") {
    if (target.distanceMiles === undefined) {
      throw new BadRequestError(`${exerciseName} requires a distance`);
    }

    return;
  }

  if (measurementType === "duration") {
    if (target.timeSeconds === undefined) {
      throw new BadRequestError(`${exerciseName} requires a duration`);
    }
  }

  if (measurementType === "intervals") {
    if (target.workSeconds === undefined) {
      throw new BadRequestError(`${exerciseName} requires a work duration`);
    }

    if (target.recoverySeconds === undefined) {
      throw new BadRequestError(`${exerciseName} requires a recovery duration`);
    }

    if (target.rounds === undefined) {
      throw new BadRequestError(`${exerciseName} requires rounds`);
    }

    return;
  }
};
