import mongoose from "mongoose";

const { Schema, model } = mongoose;

const personalRecordSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    exercise: {
      type: Schema.Types.ObjectId,
      ref: "Exercise",
      required: true,
    },
    recordType: {
      type: String,
      enum: [
        "max_weight",
        "max_reps",
        "fastest_time",
        "fastest_distance_time",
        "longest_duration",
      ],
      required: true,
    },
    recordCategory: {
      type: String,
      default: null,
    },
    value: {
      type: Number,
      required: true,
      min: 0,
    },
    distanceMiles: {
      type: Number,
      min: 0,
      default: null,
    },
    sourceType: {
      type: String,
      enum: ["workout", "verification"],
      required: true,
    },
    workoutSession: {
      type: Schema.Types.ObjectId,
      ref: "WorkoutSession",
      default: null,
    },
    verification: {
      type: Schema.Types.ObjectId,
      ref: "Verification",
      default: null,
    },
    achievedAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

personalRecordSchema.index({
  user: 1,
  exercise: 1,
  achievedAt: -1,
});

personalRecordSchema.index({
  user: 1,
  exercise: 1,
  recordType: 1,
  recordCategory: 1,
  achievedAt: -1,
});

personalRecordSchema.pre("validate", function () {
  const hasWorkoutSession = Boolean(this.workoutSession);
  const hasVerification = Boolean(this.verification);

  if (
    this.sourceType === "workout" &&
    (!hasWorkoutSession || hasVerification)
  ) {
    return;
    throw new Error(
      "Workout personal records must reference a workout session only",
    );
  }

  if (
    this.sourceType === "verification" &&
    (!hasVerification || hasWorkoutSession)
  ) {
    return;
    throw new Error(
      "Verification personal records must reference a verification only",
    );
  }
});

const PersonalRecord = model("PersonalRecord", personalRecordSchema);

export default PersonalRecord;
