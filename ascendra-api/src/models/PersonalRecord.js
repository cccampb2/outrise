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
    workoutSession: {
      type: Schema.Types.ObjectId,
      ref: "WorkoutSession",
      required: true,
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
  achievedAt: -1,
});

const PersonalRecord = model("PersonalRecord", personalRecordSchema);

export default PersonalRecord;
