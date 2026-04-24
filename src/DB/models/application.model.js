import mongoose, { Schema } from "mongoose";

const applicationSchema = new Schema(
  {
    developer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    job: {
      type: Schema.Types.ObjectId,
      ref: "Job",
      required: true,
      index: true,
    },

    company: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    proposedBudget: {
      type: Number,
      min: 0,
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

applicationSchema.index({ developer: 1, job: 1 }, { unique: true });

export const applicationModel =
  mongoose.models.Application || mongoose.model("Application", applicationSchema);

applicationModel.syncIndexes();
