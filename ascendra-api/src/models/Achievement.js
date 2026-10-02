import mongoose from "mongoose";

const { Schema, model } = mongoose;

const achievementSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      select: false,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        "workout",
        "personal_record",
        "progression",
        "echelon",
        "verification",
        "performance",
        "workout_of_the_week",
        "consistency",
        "oddity",
      ],
    },
    requirementType: {
      type: String,
      required: true,
      enum: [
        "workout_count",
        "personal_record_count",
        "level_reached",
        "echelon_reached",
        "verification_count",
        "verified_performance",
        "wotw_count",
        "workout_streak",
        "workout_total_reps",
        "workout_time_of_day",
      ],
    },
    requirement: {
      value: {
        type: Number,
        default: null,
      },
      exercise: {
        type: Schema.Types.ObjectId,
        ref: "Exercise",
        default: null,
      },
      recordCategory: {
        type: String,
        default: null,
      },
      operator: {
        type: String,
        enum: ["before", "after"],
        default: null,
      },
    },
    xpReward: {
      type: Number,
      required: true,
      min: 1,
    },
    isSecret: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    badgeKey: {
      type: String,
      required: true,
      trim: true,
      set: (value) => typeof value === "string" ? value.trim().replace(/\s+/g, "-") : value,
    },
  },
  {
    timestamps: true,
  },
);

achievementSchema.pre("validate", function () {
  if (this.isModified("name")) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]/g, "");
  }
});

// Validates that achievement requirements match the selected rule.
achievementSchema.pre("validate", function () {
  // These achievement types require a numeric threshold.
  const typesRequiringValue = [
    "workout_count",
    "personal_record_count",
    "level_reached",
    "echelon_reached",
    "verification_count",
    "wotw_count",
    "workout_streak",
    "workout_total_reps",
    "workout_time_of_day",
  ];

  if (
    typesRequiringValue.includes(this.requirementType) &&
    this.requirement?.value == null
  ) {
    throw new Error(
      `${this.requirementType} achievements require a requirement value.`,
    );
  }

  if (this.requirementType === "workout_time_of_day") {
    if (!this.requirement?.operator) {
      throw new Error("Workout time-of-day achievements require an operator");
    }
    if (this.requirement.value < 0 || this.requirement.value >= 24) {
      throw new Error(
        "Workout time-of-day achievement values must be between 0 and 24",
      );
    }
  }

  if (this.requirementType === "verified_performance") {
    if (!this.requirement?.exercise) {
      throw new Error("Verified performance achievements require an exercise.");
    }

    if (this.requirement?.value == null) {
      throw new Error(
        "Verified performance achievements require a requirement value.",
      );
    }
  }
});

const Achievement = model("Achievement", achievementSchema);

export default Achievement;
