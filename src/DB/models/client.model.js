import mongoose, { Schema } from "mongoose";

const clientSchema = new Schema(
  {
    // ربط البروفايل باليوزر
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    // بيانات أساسية
    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    userName: {
      type: String,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      default: "",
    },

    country: {
      type: String,
      default: "",
    },

    bio: {
      type: String,
      default: "",
    },

    // صورة البروفايل
    profileImage: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
clientSchema.index({ userName: 1 });
export const clientModel = mongoose.model("ClientProfile", clientSchema);
clientModel.syncIndexes()