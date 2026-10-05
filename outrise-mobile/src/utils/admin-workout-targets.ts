import type { MeasurementType, WorkoutTarget } from "@/api/workout-sessions";

export function validateAdminWorkoutTarget(
  type: MeasurementType,
  target: WorkoutTarget,
  name: string,
): string | null {
  const wholePositive = (value?: number) =>
    value !== undefined && Number.isInteger(value) && value > 0;
  const positive = (value?: number) =>
    value !== undefined && Number.isFinite(value) && value > 0;
  for (const value of Object.values(target)) {
    if (value !== undefined && (!Number.isFinite(value) || value < 0))
      return `${name}: targets must be valid nonnegative numbers.`;
  }
  if (type === "weight_reps" || type === "reps") {
    if (!wholePositive(target.sets) || !wholePositive(target.reps))
      return `${name}: enter whole numbers greater than zero for sets and reps.`;
  }
  if ((type === "time" || type === "duration") && !positive(target.timeSeconds))
    return `${name}: enter a target time greater than zero.`;
  if (type === "distance_time" && !positive(target.distanceMiles))
    return `${name}: enter a distance greater than zero.`;
  if (
    type === "intervals" &&
    (!wholePositive(target.workSeconds) ||
      target.recoverySeconds === undefined ||
      !Number.isInteger(target.recoverySeconds) ||
      !wholePositive(target.rounds))
  ) {
    return `${name}: enter whole numbers for work seconds, recovery seconds, and rounds. Work and rounds must be greater than zero.`;
  }
  return null;
}
