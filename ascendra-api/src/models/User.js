import mongoose from "mongoose";

const { Schema, model } = mongoose;

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ["user", "moderator", "admin"],
      default: "user",
    },
    accountStatus: {
      type: String,
      enum: ["active", "suspended", "banned"],
      default: "active",
    },
    faction: {
      type: Schema.Types.ObjectId,
      ref: "Faction",
      default: null,
    },
    lifetimeXP: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalWorkouts: {
      type: Number,
      default: 0,
      min: 0,
    },
    firstName: {
      type: String,
      trim: true,
      default: "",
    },

    lastName: {
      type: String,
      trim: true,
      default: "",
    },

    nameVisibility: {
      type: String,
      enum: ["public", "friends", "private"],
      default: "private",
    },

    bio: {
      type: String,
      trim: true,
      default: "",
      maxlength: 250,
    },

    profileImage: {
      url: {
        type: String,
        default: null,
      },
      publicId: {
        type: String,
        default: null,
      },
    },
  },

  { timestamps: true },
);

userSchema.index({
  accountStatus: 1,
  lifetimeXP: -1,
  _id: 1,
});

const User = model("User", userSchema);

export default User;
