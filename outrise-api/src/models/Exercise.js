import mongoose from "mongoose";

const { Schema, model } = mongoose;

const exerciseSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    normalizedName: {
      type: String,
      select: false,
      required: true,
      unique: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      enum: ["strength", "cardio", "bodyweight", "mobility"],
      required: true,
    },

    muscleGroups: {
      type: [String],
      default: [],
    },

    equipment: {
      type: [String],
      default: [],
    },

    instructions: {
      type: [String],
      default: [],
    },

    videoUrl: {
      type: String,
      default: null,
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
    baseXP: {
      type: Number,
      default: 0,
      min: 5,
      max: 30,
      select: false,
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

const Exercise = model("Exercise", exerciseSchema);

export default Exercise;
