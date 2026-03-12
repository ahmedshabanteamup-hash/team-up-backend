import mongoose, { Schema, Types } from "mongoose";

const ratingSchema = new Schema(
  {
    client: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    developer: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    project: {
      type: Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },

    ratings: {
      communication: {
        type: Number,
        min: 1,
        max: 5,
        required: true,
      },
      payments: {
        type: Number,
        min: 1,
        max: 5,
        required: true,
      },
      clarity: {
        type: Number,
        min: 1,
        max: 5,
        required: true,
      },
      professionalism: {
        type: Number,
        min: 1,
        max: 5,
        required: true,
      },
    },

    overall: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * developer يقيّم client مرة واحدة بس لكل project
 */
ratingSchema.index(
  { developer: 1, client: 1, project: 1 },
  { unique: true }
);

export const ratingModel = mongoose.models.Rating || mongoose.model("Rating", ratingSchema);
ratingModel.syncIndexes();
