import mongoose, { Schema } from "mongoose";

const interviewSchema = new Schema(
  {
    company: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    candidateName: {
      type: String,
      required: true,
      trim: true,
    },

    jobTitle: {
      type: String,
      required: true,
      trim: true,
    },

    interviewType: {
      type: String,
      enum: ["technical", "hr", "final"],
      default: "technical",
    },

    mode: {
      type: String,
      enum: ["remote", "onsite", "hybrid"],
      default: "onsite",
    },

    scheduledAt: {
      type: Date,
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["upcoming", "passed", "cancelled"],
      default: "upcoming",
      index: true,
    },

    feedback: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

export const interviewModel =
  mongoose.models.Interview || mongoose.model("Interview", interviewSchema);

interviewModel.syncIndexes();
