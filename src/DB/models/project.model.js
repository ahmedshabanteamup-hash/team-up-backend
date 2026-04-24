import mongoose, { Schema } from "mongoose";

const teamMemberSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      required: true,
      trim: true,
    },
    level: {
      type: String,
      default: "mid",
      trim: true,
    },
    status: {
      type: String,
      enum: ["online", "offline"],
      default: "offline",
    },
  },
  { _id: true }
);

const taskSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedToName: {
      type: String,
      required: true,
      trim: true,
    },
    deadline: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["todo", "in-progress", "done"],
      default: "todo",
    },
  },
  { _id: true }
);

const chatMessageSchema = new Schema(
  {
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    senderName: {
      type: String,
      required: true,
      trim: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true, _id: true }
);

const resourceSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["file", "link", "doc"],
      default: "link",
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true, _id: true }
);

const evaluationSchema = new Schema(
  {
    memberUser: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    memberName: {
      type: String,
      required: true,
      trim: true,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    comment: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true, _id: true }
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
    actorName: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true, _id: true }
);

const projectSchema = new Schema(
  {
    client: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    clientName: {
      type: String,
      default: "",
      trim: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    requiredSkills: {
      type: [String],
      default: [],
    },

    developerRole: {
      type: String,
      default: "",
      trim: true,
    },

    startDate: {
      type: Date,
      default: Date.now,
    },

    deadline: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: ["pending", "ongoing", "completed", "archived"],
      default: "ongoing",
      index: true,
    },

    currentStage: {
      type: String,
      default: "Planning",
      trim: true,
    },

    teamMembers: {
      type: [teamMemberSchema],
      default: [],
    },

    tasks: {
      type: [taskSchema],
      default: [],
    },

    evaluations: {
      type: [evaluationSchema],
      default: [],
    },

    activities: {
      type: [activitySchema],
      default: [],
    },

    chatMessages: {
      type: [chatMessageSchema],
      default: [],
    },

    resources: {
      type: [resourceSchema],
      default: [],
    },

    teamSize: {
      type: Number,
      default: 0,
      min: 0,
    },

    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },

    deletedAt: {
      type: Date,
    },

    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

export const projectModel = mongoose.models.Project || mongoose.model("Project", projectSchema);
projectModel.syncIndexes();
