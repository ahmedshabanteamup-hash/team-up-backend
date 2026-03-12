import mongoose, { Schema } from "mongoose";

const billingHistorySchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
    },

    amount: {
      type: Number,
      required: true,
    },

    currency: {
      type: String,
      default: "USD",
    },

    status: {
      type: String,
      enum: ["paid", "pending", "failed"],
      required: true,
    },

    paidAt: Date,
  },
  { timestamps: true }
);

export const billingHistoryModel = mongoose.model(
  "BillingHistory",
  billingHistorySchema
);
