import mongoose, { Schema } from "mongoose";

const projectSchema = new Schema(
  {
    client: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: ["ongoing", "completed", "archived"],
      default: "ongoing",
      index: true,
    },

    teamSize: {
      type: Number,
      default: 0,
      min: 0,
    },

    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null, // يظهر — في UI لو مفيش تقييم
    },

    deletedAt: {
      type: Date,
    },

    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

export const projectModel = mongoose.models.Project || mongoose.model("Project", projectSchema);
  projectModel.syncIndexes()
