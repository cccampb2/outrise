import mongoose from "mongoose";

const { Schema, model } = mongoose;
const activityEventSchema = new Schema(
  {
    type: {
      type: String,
      enum: [
        "message_received",
        "friend_request_received",
        "friend_request_accepted",
        "personal_record_set",
        "echelon_reached",
        "wotw_completed",
        "achievement_unlocked",
        "verification_approved",
        "verification_rejected",
        "workout_completed",
        "faction_rank_changed",
        "faction_first_place",
        "faction_season_won",
        "faction_milestone",
        "wotw_launched",
      ],
      required: true,
    },
    actor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      required: function () {
        return ["personal", "friends"].includes(this.audience);
      },
    },
    audience: {
      type: String,
      enum: ["personal", "friends", "faction", "global"],
      required: true,
    },
    faction: {
      type: Schema.Types.ObjectId,
      ref: "Faction",
      default: null,
      required: function () {
        return this.audience === "faction";
      },
    },
    recipient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      required: function () {
        return this.audience === "personal";
      },
    },
    sourceType: {
      type: String,
      enum: [
        "message",
        "friendship",
        "personal_record",
        "xp_transaction",
        "workout_of_the_week_occurrence",
        "achievement",
        "verification",
        "workout_session",
        "season",
      ],
      required: true,
    },
    sourceId: { type: Schema.Types.ObjectId, required: true },
    details: {
      conversationId: {
        type: Schema.Types.ObjectId,
        ref: "Conversation",
        required: function () {
          return this.type === "message_received";
        },
      },
      factionName: { type: String },
      previousRank: { type: Number, min: 1 },
      rank: { type: Number, min: 1 },
      milestone: { type: Number, min: 1 },
      totalXP: { type: Number, min: 0 },
      seasonNumber: { type: Number, min: 1 },
      actorUsername: {
        type: String,
        required: function () {
          return ["personal", "friends"].includes(this.audience);
        },
      },
      achievementName: {
        type: String,
        required: function () {
          return this.type === "achievement_unlocked";
        },
      },
      workoutName: {
        type: String,
        required: function () {
          return [
            "wotw_completed",
            "workout_completed",
            "wotw_launched",
          ].includes(this.type);
        },
      },
      echelon: {
        type: Number,
        min: 1,
        max: 10,
        validate: {
          validator: Number.isInteger,
          message: "Echelon must be a whole number",
        },
        required: function () {
          return this.type === "echelon_reached";
        },
      },
      exerciseName: {
        type: String,
        required: function () {
          return [
            "personal_record_set",
            "verification_approved",
            "verification_rejected",
          ].includes(this.type);
        },
      },
      recordType: {
        type: String,
        enum: [
          "max_weight",
          "max_reps",
          "fastest_time",
          "fastest_distance_time",
          "longest_duration",
        ],
        required: function () {
          return this.type === "personal_record_set";
        },
      },
      recordCategory: { type: String, default: null },
      value: {
        type: Number,
        min: 0,
        required: function () {
          return this.type === "personal_record_set";
        },
      },
      unit: {
        type: String,
        enum: ["lb", "reps", "seconds"],
        required: function () {
          return this.type === "personal_record_set";
        },
      },
      distanceMiles: { type: Number, min: 0, default: null },
    },
    idempotencyKey: { type: String, required: true },
    occurredAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true },
);

activityEventSchema.index({ idempotencyKey: 1 }, { unique: true });
activityEventSchema.index({
  recipient: 1,
  audience: 1,
  occurredAt: -1,
  _id: -1,
});
activityEventSchema.index({ actor: 1, audience: 1, occurredAt: -1, _id: -1 });
activityEventSchema.index({ faction: 1, audience: 1, occurredAt: -1, _id: -1 });
activityEventSchema.index({ audience: 1, occurredAt: -1, _id: -1 });
activityEventSchema.pre("validate", function () {
  const isPR = this.type === "personal_record_set";
  const rules = {
    message_received: ["personal", "message"],
    friend_request_received: ["personal", "friendship"],
    friend_request_accepted: ["personal", "friendship"],
    personal_record_set: ["friends", "personal_record"],
    echelon_reached: ["friends", "xp_transaction"],
    wotw_completed: ["friends", "workout_of_the_week_occurrence"],
    achievement_unlocked: ["personal", "achievement"],
    verification_approved: ["personal", "verification"],
    verification_rejected: ["personal", "verification"],
    workout_completed: ["friends", "workout_session"],
    wotw_launched: ["global", "workout_of_the_week_occurrence"],
    faction_rank_changed: ["faction", "season"],
    faction_first_place: ["faction", "season"],
    faction_season_won: ["faction", "season"],
    faction_milestone: ["faction", "season"],
  };
  const expected = rules[this.type];
  if (
    expected &&
    (this.audience !== expected[0] || this.sourceType !== expected[1])
  ) {
    this.invalidate("audience", "Audience or source does not match event type");
  }
  if (this.audience !== "personal" && this.recipient) {
    this.invalidate("recipient", "Only personal events may have a recipient");
  }
  if (this.audience !== "faction" && this.faction) {
    this.invalidate("faction", "Only faction events may have a faction");
  }
  if (["faction", "global"].includes(this.audience) && this.actor) {
    this.invalidate("actor", "System events must not have a user actor");
  }
  if (
    [
      "achievement_unlocked",
      "verification_approved",
      "verification_rejected",
    ].includes(this.type) &&
    this.actor?.toString() !== this.recipient?.toString()
  ) {
    this.invalidate(
      "recipient",
      "Personal progress events must belong to the actor",
    );
  }
  if (
    this.audience === "faction" &&
    (!this.details.factionName || !Number.isInteger(this.details.seasonNumber))
  ) {
    this.invalidate("details", "Faction name and season number are required");
  }
  if (
    this.type === "faction_rank_changed" &&
    (!Number.isInteger(this.details.previousRank) ||
      !Number.isInteger(this.details.rank) ||
      this.details.previousRank === this.details.rank)
  ) {
    this.invalidate(
      "details.rank",
      "Rank change requires different old and new ranks",
    );
  }
  if (
    this.type === "faction_milestone" &&
    (!Number.isInteger(this.details.milestone) ||
      this.details.totalXP < this.details.milestone ||
      this.details.totalXP == null)
  ) {
    this.invalidate(
      "details.milestone",
      "Milestone and qualifying XP total are required",
    );
  }
  if (isPR) {
    const unit =
      this.details.recordType === "max_weight"
        ? "lb"
        : this.details.recordType === "max_reps"
          ? "reps"
          : "seconds";
    if (this.details.unit !== unit) {
      this.invalidate("details.unit", "Unit does not match the record type");
    }
    if (
      this.details.recordType === "fastest_distance_time" &&
      this.details.distanceMiles == null
    ) {
      this.invalidate(
        "details.distanceMiles",
        "Distance is required for a distance/time PR",
      );
    }
  }
});

const ActivityEvent = model("ActivityEvent", activityEventSchema);

export default ActivityEvent;
