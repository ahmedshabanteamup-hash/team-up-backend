import mongoose, { Schema } from "mongoose";

const skillQuizAttemptSchema = new Schema(
  {
    developer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    trackKey: {
      type: String,
      enum: ["frontend", "backend", "ai", "uiux"],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "submitted", "expired"],
      default: "active",
      index: true,
    },
    totalQuestions: {
      type: Number,
      required: true,
    },
    score: {
      type: Number,
      default: 0,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    submittedAt: {
      type: Date,
      default: null,
    },
    answers: [
      {
        questionId: { type: String, required: true },
        selectedOptionId: { type: String, required: true },
        isCorrect: { type: Boolean, default: false },
      },
    ],
  },
  {
    timestamps: true,
  }
);

skillQuizAttemptSchema.index({ developer: 1, status: 1, createdAt: -1 });

export const skillQuizAttemptModel =
  mongoose.models.SkillQuizAttempt ||
  mongoose.model("SkillQuizAttempt", skillQuizAttemptSchema);

skillQuizAttemptModel.syncIndexes();
