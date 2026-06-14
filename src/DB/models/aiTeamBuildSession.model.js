import mongoose, { Schema } from "mongoose";

const suggestedMemberSchema = new Schema(
  {
    developer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    track: {
      type: String,
      default: "",
      trim: true,
    },
    level: {
      type: String,
      default: "mid",
      trim: true,
    },
    yearsExperience: {
      type: Number,
      default: 0,
      min: 0,
    },
    availabilityLabel: {
      type: String,
      default: "immediate",
      trim: true,
    },
    hourRate: {
      type: Number,
      default: 0,
      min: 0,
    },
    hoursPerWeek: {
      type: Number,
      default: 0,
      min: 0,
    },
    weeklyCost: {
      type: Number,
      default: 0,
      min: 0,
    },
    score: {
      type: Number,
      default: 0,
      min: 0,
    },
    matchedSkills: {
      type: [String],
      default: [],
    },
    accepted: {
      type: Boolean,
      default: false,
    },
    aiReasoning: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { _id: false }
);

const activitySchema = new Schema(
  {
    type: {
      type: String,
      default: "update",
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    details: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { _id: true, timestamps: true }
);

const aiTeamBuildSessionSchema = new Schema(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    sourceType: {
      type: String,
      enum: ["manual", "job", "project"],
      default: "manual",
      index: true,
    },
    sourceId: {
      type: Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    projectTitle: {
      type: String,
      default: "",
      trim: true,
    },
    requiredSkills: {
      type: [String],
      default: [],
    },
    teamSize: {
      type: Number,
      default: 0,
      min: 1,
    },
    priority: {
      type: String,
      default: "balanced",
      trim: true,
    },
    budget: {
      type: Number,
      default: 0,
      min: 0,
    },
    matchScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    readinessPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    recommendationText: {
      type: String,
      default: "",
      trim: true,
    },
    notes: {
      type: String,
      default: "",
      trim: true,
    },
    suggestedMembers: {
      type: [suggestedMemberSchema],
      default: [],
    },
    recentActivity: {
      type: [activitySchema],
      default: [],
    },
    status: {
      type: String,
      enum: ["draft", "approved", "rejected"],
      default: "draft",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

aiTeamBuildSessionSchema.index({ owner: 1, createdAt: -1 });

export const aiTeamBuildSessionModel =
  mongoose.models.AiTeamBuildSession ||
  mongoose.model("AiTeamBuildSession", aiTeamBuildSessionSchema);

aiTeamBuildSessionModel.syncIndexes();
