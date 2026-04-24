import mongoose, { Schema } from "mongoose";

const jobSchema = new Schema(
  {
    company: {
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
      required: true,
    },

    type: {
      type: String,
      enum: ["full-time", "part-time", "contract"],
      required: true,
    },

    workMode: {
      type: String,
      enum: ["remote", "onsite", "hybrid"],
      required: true,
    },

    location: {
      type: String,
      default: "",
      trim: true,
    },

    workType: {
      type: String,
      enum: ["freelance-contract", "full-time"],
      default: "freelance-contract",
    },

    skills: [
      {
        type: String,
      },
    ],

    budget: {
      type: Number,
      min: 0,
      default: null,
    },

    budgetMin: {
      type: Number,
      min: 0,
      default: null,
    },

    budgetMax: {
      type: Number,
      min: 0,
      default: null,
    },

    estimatedDuration: {
      type: String,
      default: "",
      trim: true,
    },

    applicationsCount: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ["active", "closed"],
      default: "active",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const jobModel = mongoose.models.Job || mongoose.model("Job", jobSchema);

jobModel.syncIndexes();
