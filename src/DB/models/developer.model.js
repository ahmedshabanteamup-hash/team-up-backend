import mongoose, { Schema } from "mongoose";

export const roleEnum = {
  admin: "admin",
  client: "client",
  developer: "developer",
  company: "company",
};

export const specializationEnum = {
  frontend: "frontend",
  backend: "backend",
  fullstack: "fullstack",
  ai: "ai",
  ui: "ui",
  embedded: "embedded",
};

export const experienceLevelEnum = {
  junior: "junior",
  mid: "mid",
  senior: "senior",
};

export const availabilityEnum = {
  available: "available",
  busy: "busy",
  offline: "offline",
};

const developerSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    title: {
      type: String,
      default: "",
      trim: true,
    },

    bio: {
      type: String,
      default: "",
      maxlength: 500,
    },

    profilePicture: {
      url: {
        type: String,
        default: "",
      },
      publicId: {
        type: String,
        default: "",
      },
    },

    cv: {
      url: {
        type: String,
        default: "",
      },
      publicId: {
        type: String,
        default: "",
      },
    },

    skills: {
      type: [String],
      required: true,
      index: true,
      default: [],
    },

    specialization: {
      type: String,
      enum: Object.values(specializationEnum),
    },

    experienceLevel: {
      type: String,
      enum: Object.values(experienceLevelEnum),
    },

    yearsExperience: {
      type: Number,
      default: 0,
      min: 0,
    },

    availability: {
      type: String,
      enum: Object.values(availabilityEnum),
      default: availabilityEnum.available,
    },

    isOnline: {
      type: Boolean,
      default: true,
    },

    rank: {
      type: String,
      enum: ["Bronze", "Silver", "Gold", "Platinum"],
      default: "Bronze",
    },

    rankPoints: {
      type: Number,
      default: 0,
      min: 0,
    },

    portfolio: [
      {
        title: { type: String, required: true, trim: true },
        description: { type: String, required: true, trim: true },
        technologies: [{ type: String, trim: true }],
        roleInProject: { type: String, default: "", trim: true },
        projectUrl: { type: String, default: "", trim: true },
        githubUrl: { type: String, default: "", trim: true },
      },
    ],

    workHistory: [
      {
        projectTitle: { type: String, required: true, trim: true },
        clientName: { type: String, required: true, trim: true },
        role: { type: String, required: true, trim: true },
        duration: { type: String, default: "", trim: true },
        months: { type: Number, default: 0, min: 0 },
        status: {
          type: String,
          enum: ["ongoing", "completed"],
          default: "completed",
        },
        rating: { type: Number, min: 0, max: 5, default: 0 },
      },
    ],

    workingHours: {
      type: String,
      default: "",
      trim: true,
    },

    preferredJobTypes: {
      type: [String],
      default: [],
    },

    salaryExpectation: {
      type: String,
      default: "",
      trim: true,
    },

    acceptingNewProjects: {
      type: Boolean,
      default: true,
    },

    githubUrl: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

export const developerModel = mongoose.model("DeveloperProfile", developerSchema);
developerModel.syncIndexes();
