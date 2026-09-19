import mongoose from "mongoose";

const { Schema, model } = mongoose;

const userAchievementSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    achievement: {
      type: Schema.Types.ObjectId,
      ref: "Achievement",
      required: true,
    },
    unlockedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    sourceType: {
      type: String,
      required: true,
      enum: [
        "workout_session",
        "personal_record",
        "verification",
        "progression",
        "echelon",
        "workout_of_the_week",
      ],
    },
    source: {
      type: Schema.Types.ObjectId,
      refPath: "sourceModel",
      default: null,
    },
    sourceModel: {
      type: String,
      enum: [
        "WorkoutSession",
        "PersonalRecord",
        "Verification",
        "WorkoutOfTheWeekOccurrence",
      ],
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

userAchievementSchema.index(
  {
    user: 1,
    achievement: 1,
  },
  { unique: true },
);

userAchievementSchema.pre("validate", function () {
  const hasSource = Boolean(this.source);

  const hasSourceModel = Boolean(this.sourceModel);

  if (hasSource !== hasSourceModel) {
    throw new Error(
      "User achievement source and sourceModel must be provided together",
    );
  }
});

const UserAchievement = model("UserAchievement", userAchievementSchema);

export default UserAchievement;
