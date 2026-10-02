import mongoose from "mongoose";

const { Schema, model } = mongoose;

const factionSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
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
    motto: {
      type: String,
      required: true,
      trim: true,
    },
    tagline: {
      type: String,
      required: true,
      trim: true,
    },
    values: {
      type: [String],
      default: [],
    },
    colors: {
      primary: {
        type: String,
        required: true,
      },
      hover: {
        type: String,
        required: true,
      },
      deep: {
        type: String,
        required: true,
      },
      darkSurface: {
        type: String,
        required: true,
      },
      border: {
        type: String,
        required: true,
      },
      glow: {
        type: String,
        required: true,
      },
    },
  },
  {
    timestamps: true,
  },
);

const Faction = model("Faction", factionSchema);

export default Faction;
