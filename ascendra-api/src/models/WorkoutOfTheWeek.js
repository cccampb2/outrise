import mongoose from "mongoose";

const { Schema, model } = mongoose;

const workoutOfTheWeekSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    bonusXP: {
      type: Number,
      required: true,
      min: 1,
    },
    difficulty: {
      type: String,

      enum: ["easy", "medium", "hard", "impossible", "just_fun"],

      required: true,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    exercises: [
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
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

const WorkoutOfTheWeek = model("WorkoutOfTheWeek", workoutOfTheWeekSchema);

export default WorkoutOfTheWeek;
