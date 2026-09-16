import mongoose from "mongoose";

const { Schema, model } = mongoose;

const workoutOfTheWeekOccurrenceSchema = new Schema(
  {
    workoutOfTheWeek: {
      type: Schema.Types.ObjectId,
      ref: "WorkoutOfTheWeek",
      required: true,
    },
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

    startsAt: {
      type: Date,

      required: true,
    },

    endsAt: {
      type: Date,

      required: true,
    },

    status: {
      type: String,

      enum: ["upcoming", "active", "completed"],

      required: true,

      default: "upcoming",
    },

    exercises: [
      {
        exercise: {
          type: Schema.Types.ObjectId,

          ref: "Exercise",

          required: true,
        },

        exerciseName: {
          type: String,

          required: true,

          trim: true,
        },

        measurementType: {
          type: String,

          enum: ["weight_reps", "reps", "time", "distance_time", "duration"],

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
        },
      },
    ],

    selectionSource: {
      type: String,

      enum: ["admin", "random"],

      required: true,
    },

    selectedBy: {
      type: Schema.Types.ObjectId,

      ref: "User",

      default: null,
    },
  },
  {
    timestamps: true,
  },
);

workoutOfTheWeekOccurrenceSchema.index(
  {
    status: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      status: "active",
    },
    name: "unique_active_wotw_occurrence",
  },
);

workoutOfTheWeekOccurrenceSchema.index(
  {
    startsAt: 1,
  },
  {
    unique: true,
    name: "unique_wotw_week_start",
  },
);

const WorkoutOfTheWeekOccurrence = model(
  "WorkoutOfTheWeekOccurrence",

  workoutOfTheWeekOccurrenceSchema,
);

export default WorkoutOfTheWeekOccurrence;
