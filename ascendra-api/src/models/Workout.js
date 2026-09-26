import mongoose from "mongoose";

const { Schema, model } = mongoose;

const workoutExerciseSchema = new Schema(
  {
    exercise: {
      type: Schema.Types.ObjectId,
      ref: "Exercise",
      required: true,
    },
    order: {
      type: Number,
      required: true,
      min: 0,
    },
    target: {
      sets: {
        type: Number,
        min: 1,
      },
      reps: {
        type: Number,
        min: 1,
      },
      weightLbs: {
        type: Number,
        min: 0,
      },
      distanceMiles: {
        type: Number,
        min: 0,
      },
      timeSeconds: {
        type: Number,
        min: 0,
      },
      workSeconds: {
        type: Number,
        min: 1,
      },
      recoverySeconds: {
        type: Number,
        min: 0,
      },
      rounds: {
        type: Number,
        min: 1,
      },
    },
  },
  {
    _id: false,
  },
);

const workoutSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxLength: 100 },
    description: { type: String, trim: true, maxLength: 1000, default: "" },
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    exercises: {
      type: [workoutExerciseSchema],
      required: true,
      validate: {
        validator: function (exercises) {
          return exercises.length > 0;
        },
        message: "A workout must contain at least one exercise",
      },
    },
    visibility: {
      type: String,
      enum: ["private", "public"],
      default: "private",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

workoutSchema.index({
  owner: 1,
  createdAt: -1,
});

const Workout = model("Workout", workoutSchema);

export default Workout;
