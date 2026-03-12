import mongoose, { Schema } from "mongoose";

const jobSchema = new Schema(
{
  company: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },

  title: {
    type: String,
    required: true,
    trim: true
  },

  description: {
    type: String,
    required: true
  },

  type: {
    type: String,
    enum: ["full-time", "part-time", "contract"],
    required: true
  },

  workMode: {
    type: String,
    enum: ["remote", "onsite", "hybrid"],
    required: true
  },

  skills: [
    {
      type: String
    }
  ],

  applicationsCount: {
    type: Number,
    default: 0
  },

  status: {
    type: String,
    enum: ["active", "closed"],
    default: "active",
    index: true
  }

},
{
  timestamps: true
}
);

export const jobModel =
mongoose.models.Job || mongoose.model("Job", jobSchema);

jobModel.syncIndexes();