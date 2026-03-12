import mongoose from "mongoose";

const { Schema } = mongoose;

const companySchema = new Schema(
  {
    // ??? ?????? ??????? ???????
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    // ???????? ???? ?? ???? ??? sign up
    companyName: {
      type: String,
      required: true,
      trim: true,
    },

    companySize: {
      type: String,
      required: true,
      trim: true,
    },

    industry: {
      type: String,
      required: true,
      trim: true,
    },

    // ????? ??? dashboard ????? (?? ?? ??? sign up)
    logo: {
      url: { type: String, default: "" },
      public_id: { type: String, default: "" },
    },

    description: {
      type: String,
      default: "",
    },

    website: {
      type: String,
      default: "",
      trim: true,
    },

    contactEmail: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },

    location: {
      type: String,
      default: "",
      trim: true,
    },

    projectTypes: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// ???? ????? ??????
companySchema.index({ companyName: 1 });

export const companyModel = mongoose.model("CompanyProfile", companySchema);
companyModel.syncIndexes();
