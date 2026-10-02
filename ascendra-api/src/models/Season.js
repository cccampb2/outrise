import mongoose from "mongoose";

const { Schema, model } = mongoose;

const seasonSchema = new Schema(
  {
    activityRevision: { type: Number, default: 0, min: 0 },
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
      default: "upcoming",
      required: true,
    },
    winningFaction: {
      type: Schema.Types.ObjectId,
      ref: "Faction",
      default: null,
    },
    seasonNumber: {
      type: Number,
      required: true,
      unique: true,
      min: 1,
    },
    quarter: {
      type: Number,
      required: true,
      min: 1,
      max: 4,
    },
    year: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

seasonSchema.index(
  { status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ["active", "upcoming"] } },
    name: "unique_current_season_status",
  },
);

seasonSchema.virtual("name").get(function () {
  return `Season ${this.seasonNumber} - Q${this.quarter} - ${this.year}`;
});

seasonSchema.set("toJSON", { virtuals: true });
seasonSchema.set("toObject", { virtuals: true });

const Season = model("Season", seasonSchema);

export default Season;
