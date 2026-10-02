import mongoose from "mongoose";

const { Schema, model } = mongoose;

const seasonContributionSchema = new Schema(
  {
    season: {
      type: Schema.Types.ObjectId,
      ref: "Season",
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    faction: {
      type: Schema.Types.ObjectId,
      ref: "Faction",
      required: true,
    },
    xp: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
);

seasonContributionSchema.index({ season: 1, faction: 1, xp: -1 });

seasonContributionSchema.index(
  { season: 1, user: 1 },

  { unique: true },
);
const SeasonContribution = model(
  "SeasonContribution",
  seasonContributionSchema,
);

export default SeasonContribution;
