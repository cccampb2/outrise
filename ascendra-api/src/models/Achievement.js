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
        "redemption_arc",
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

const Achievement = model("Achievement", achievementSchema);

export default Achievement;
