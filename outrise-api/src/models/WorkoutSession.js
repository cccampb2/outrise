import mongoose from "mongoose";

const { Schema, model } = mongoose;

const actualSetSchema = new Schema(
  {
    order: {
      type: Number,
      required: true,
      min: 0,
    },
    reps: {
      type: Number,
      min: 0,
    },
    weightLbs: {
      type: Number,
      min: 0,
    },
  },
  {
    _id: false,
  },
);

const actualPerformanceSchema = new Schema(
  {
    sets: {
      type: [actualSetSchema],
      default: null,
    },
    distanceMiles: {
      type: Number,
      min: 0,
    },
    timeSeconds: {
      type: Number,
      min: 0,
    },
    roundsCompleted: {
      type: Number,
      min: 0,
    },
  },
  {
    _id: false,
  },
);

const sessionTargetSchema = new Schema(
  {
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
  {
    _id: false,
  },
);

const sessionExerciseSchema = new Schema(
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
      enum: [
        "weight_reps",
        "reps",
        "time",
        "distance_time",
        "duration",
        "intervals",
      ],
      required: true,
    },
    order: {
      type: Number,
      required: true,
      min: 0,
    },
    actual: {
      type: actualPerformanceSchema,
      default: () => ({}),
    },
    skipped: {
      type: Boolean,
      default: false,
    },
    target: {
      type: sessionTargetSchema,
      default: () => ({}),
    },
  },
  {
    _id: false,
  },
);

const workoutSessionSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sourceType: {
      type: String,
      enum: ["workout", "workout_of_the_week", "repeat"],
      default: "workout",
      required: true,
    },
    workout: {
      type: Schema.Types.ObjectId,
      ref: "Workout",
      default: null,
    },
    workoutOfTheWeekOccurrence: {
      type: Schema.Types.ObjectId,
      ref: "WorkoutOfTheWeekOccurrence",
      default: null,
    },
    workoutName: {
      type: String,
      required: true,
      trim: true,
    },
    exercises: {
      type: [sessionExerciseSchema],
      required: true,
      validate: {
        validator: function (exercises) {
          return exercises.length > 0;
        },
        message: "A workout session must contain at least one exercise",
      },
    },
    status: {
      type: String,
      enum: ["active", "completed", "cancelled"],
      default: "active",
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    durationSeconds: {
      type: Number,
      min: 0,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

workoutSessionSchema.pre("validate", function () {
  if (this.sourceType === "workout") {
    if (!this.workout) {
      this.invalidate(
        "workout",
        "A regular workout session must reference a Workout",
      );
    }

    if (this.workoutOfTheWeekOccurrence) {
      this.invalidate(
        "workoutOfTheWeekOccurrence",
        "A regular workout session cannot reference a WOTW occurrence",
      );
    }
  }

  if (this.sourceType === "workout_of_the_week") {
    if (!this.workoutOfTheWeekOccurrence) {
      this.invalidate(
        "workoutOfTheWeekOccurrence",
        "A WOTW session must reference a WOTW occurrence",
      );
    }

    if (this.workout) {
      this.invalidate(
        "workout",
        "A WOTW session cannot reference a regular Workout",
      );
    }
  }
});

workoutSessionSchema.index({
  user: 1,
  status: 1,
  startedAt: -1,
});

workoutSessionSchema.index(
  {
    user: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      status: "active",
    },
  },
);

workoutSessionSchema.index(
  {
    user: 1,
    workoutOfTheWeekOccurrence: 1,
  },
  {
    unique: true,
    name: "unique_user_wotw_original_attempt",
    partialFilterExpression: {
      sourceType: "workout_of_the_week",
    },
  },
);

const WorkoutSession = model("WorkoutSession", workoutSessionSchema);
export default WorkoutSession;
