import { projectModel } from "../../DB/models/project.model.js";
import { jobModel } from "../../DB/models/jop.model.js";
import { applicationModel } from "../../DB/models/application.model.js";
import { ratingModel } from "../../DB/models/rating.model.js";
import * as dbService from "../../DB/db.service.js";
import { asyncHandeler, successResponse } from "../../utils/response.js";
import { roleEnum, userModel } from "../../DB/models/user.model.js";
import { developerModel } from "../../DB/models/developer.model.js";

const isProjectOwnerOrMember = (project, userId) => {
  if (String(project.client) === String(userId)) return true;

  return (project.teamMembers || []).some(
    (member) => String(member.user) === String(userId)
  );
};

const getProjectOrThrow = async ({ projectId, userId, next }) => {
  const project = await dbService.findOne({
    model: projectModel,
    filter: { _id: projectId, deletedAt: { $exists: false } },
  });

  if (!project) {
    next(new Error("project not found", { cause: 404 }));
    return null;
  }

  if (!isProjectOwnerOrMember(project, userId)) {
    next(new Error("not allowed to access this project", { cause: 403 }));
    return null;
  }

  return project;
};

const getProjectAsOwnerOrThrow = async ({ projectId, ownerId, next }) => {
  const project = await dbService.findOne({
    model: projectModel,
    filter: {
      _id: projectId,
      client: ownerId,
      deletedAt: { $exists: false },
    },
  });

  if (!project) {
    next(new Error("project not found or not owned by current user", { cause: 404 }));
    return null;
  }

  return project;
};

const buildProjectProgress = (project) => {
  const tasks = project.tasks || [];
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((task) => task.status === "done").length;
  const inProgressTasks = tasks.filter((task) => task.status === "in-progress").length;
  const todoTasks = tasks.filter((task) => task.status === "todo").length;
  const progressPercent = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  return {
    progressPercent,
    completedTasks,
    totalTasks,
    inProgressTasks,
    todoTasks,
    progressText: `${completedTasks}/${totalTasks} tasks`,
    currentStage: project.currentStage || "Planning",
  };
};

const pushActivity = ({ project, title, details = "", actorName = "System", type = "update" }) => {
  const existing = project.activities || [];
  const next = [
    {
      type,
      title,
      details,
      actorName,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    ...existing,
  ].slice(0, 50);

  return next;
};

const sortTasksForLeader = (tasks = []) => {
  const priorityWeight = { high: 3, medium: 2, low: 1 };
  const statusWeight = { "in-progress": 3, todo: 2, done: 1 };

  return [...tasks].sort((a, b) => {
    const byStatus = (statusWeight[b.status] || 0) - (statusWeight[a.status] || 0);
    if (byStatus !== 0) return byStatus;

    const byPriority = (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
    if (byPriority !== 0) return byPriority;

    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  });
};

const formatTaskPriority = (priority = "") => {
  if (priority === "high") return "High Priority";
  if (priority === "medium") return "Medium";
  return "Low";
};

const formatTaskStatus = (status = "") => {
  if (status === "in-progress") return "In Progress";
  if (status === "done") return "Done";
  return "To Do";
};

const normalizeJobPostPayload = (body) => {
  const {
    title,
    description,
    skills,
    teamSize,
    budget,
    deadline,
    estimatedDuration,
    workType,
    priority,
    workMode = "remote",
  } = body;

  const normalizedType = workType === "full-time" ? "full-time" : "contract";

  return {
    title,
    description,
    skills,
    teamSize,
    budget,
    budgetMin: budget,
    budgetMax: budget,
    deadline,
    estimatedDuration,
    workType,
    priority,
    type: normalizedType,
    workMode,
  };
};

const formatJobPostPayload = (job) => ({
  jobId: job._id,
  title: job.title,
  description: job.description,
  skills: job.skills || [],
  teamSize: job.teamSize,
  budget: job.budget,
  deadline: job.deadline,
  estimatedDuration: job.estimatedDuration || "",
  workType: job.workType,
  priority: job.priority || "medium",
  workMode: job.workMode,
  type: job.type,
  status: job.status,
  publicationStatus: job.publicationStatus || "published",
  createdAt: job.createdAt,
  updatedAt: job.updatedAt,
});

const mapJobStatusLabel = (status) => (status === "closed" ? "Closed" : "Open");

const formatJobTypeLabel = (job = {}) => {
  if (job.type === "full-time" || job.workType === "full-time") return "Full-Time";
  if (job.type === "part-time") return "Part-Time";
  return "Contract";
};

const formatBudgetLabel = (job = {}) => {
  if (job.budgetMin && job.budgetMax) return `$${job.budgetMin} - $${job.budgetMax}`;
  if (job.budget) return `$${job.budget}`;
  if (job.budgetMin) return `From $${job.budgetMin}`;
  if (job.budgetMax) return `Up to $${job.budgetMax}`;
  return "Not specified";
};

const formatApplicantStatusLabel = (status = "") => {
  const labels = {
    pending: "New",
    shortlisted: "Shortlisted",
    interviewed: "Interviewed",
    accepted: "Accepted",
    rejected: "Rejected",
  };

  return labels[status] || status;
};

const formatMyJobCard = (job) => ({
  jobId: job._id,
  title: job.title,
  status: job.status,
  statusLabel: mapJobStatusLabel(job.status),
  publicationStatus: job.publicationStatus || "published",
  applicantsCount: job.applicationsCount || 0,
  workType: job.workType,
  budget: job.budget,
  deadline: job.deadline,
  createdAt: job.createdAt,
  actions: {
    canViewDetails: true,
    canEdit: true,
    canDelete: true,
  },
});

const assertClientRole = ({ req, next, actionLabel = "access this endpoint" }) => {
  if (req.user.role !== roleEnum.client) {
    next(new Error(`only client can ${actionLabel}`, { cause: 403 }));
    return false;
  }

  return true;
};

const getClientJobOrThrow = async ({ jobId, userId, publicationStatus, next }) => {
  const filter = {
    _id: jobId,
    company: userId,
  };

  if (publicationStatus) {
    filter.publicationStatus = publicationStatus;
  }

  const job = await dbService.findOne({
    model: jobModel,
    filter,
  });

  if (!job) {
    next(new Error("job not found or not owned by current client", { cause: 404 }));
    return null;
  }

  return job;
};

export const createProject = asyncHandeler(async (req, res, next) => {
  const userId = req.user._id;
  const {
    title,
    description,
    teamSize,
    requiredSkills = [],
    developerRole = "",
    clientName = "",
    startDate,
    deadline,
    currentStage = "Planning",
  } = req.body;

  if (req.user.role !== roleEnum.client) {
    return next(new Error("only client can create project", { cause: 403 }));
  }

  const [project] = await dbService.create({
    model: projectModel,
    data: [
      {
        client: userId,
        clientName,
        title,
        description,
        teamSize,
        requiredSkills,
        developerRole,
        startDate,
        deadline,
        currentStage,
      },
    ],
  });

  return successResponse({
    res,
    status: 201,
    message: "project created successfully",
    data: { project },
  });
});

export const getProjectDetailsForDeveloper = asyncHandeler(async (req, res, next) => {
  const { projectId } = req.params;

  const project = await getProjectOrThrow({
    projectId,
    userId: req.user._id,
    next,
  });

  if (!project) return;

  const progress = buildProjectProgress(project);
  const isOwner = String(project.client) === String(req.user._id);
  const formatTaskStatus = (status) => {
    if (status === "in-progress") return "In Progress";
    if (status === "done") return "Done";
    return "To do";
  };

  return successResponse({
    res,
    message: "project details fetched successfully",
    data: {
      header: {
        projectName: project.title,
        projectStatus: project.status,
        projectStatusLabel: project.status === "ongoing" ? "Active" : project.status,
        clientName: project.clientName || "",
        deadline: project.deadline,
      },
      overview: {
        description: project.description,
        requiredSkills: project.requiredSkills || [],
        developerRole: project.developerRole || "",
        startDate: project.startDate,
        deadline: project.deadline,
        timelineText:
          project.startDate && project.deadline
            ? `${new Date(project.startDate).toDateString()} - ${new Date(project.deadline).toDateString()}`
            : "",
      },
      teamMembers: (project.teamMembers || []).map((member) => ({
        memberId: member._id,
        userId: member.user,
        name: member.name,
        role: member.role,
        level: member.level,
        status: member.status,
      })),
      tasks: (project.tasks || []).map((task) => ({
        taskId: task._id,
        taskTitle: task.title,
        description: task.description,
        priority: task.priority,
        assignedToUserId: task.assignedTo,
        assignedTo: task.assignedToName,
        deadline: task.deadline,
        status: task.status,
        statusLabel: formatTaskStatus(task.status),
        canUpdateStatus: isOwner || String(task.assignedTo) === String(req.user._id),
      })),
      chatMessages: (project.chatMessages || []).map((msg) => ({
        messageId: msg._id,
        senderName: msg.senderName,
        text: msg.text,
        createdAt: msg.createdAt,
      })),
      resources: (project.resources || []).map((resource) => ({
        resourceId: resource._id,
        title: resource.title,
        type: resource.type,
        url: resource.url,
        createdAt: resource.createdAt,
      })),
      progress,
      actions: {
        canAddTask: isOwner,
      },
    },
  });
});

export const getLeaderDashboard = asyncHandeler(async (req, res, next) => {
  const { projectId } = req.params;

  const project = await getProjectAsOwnerOrThrow({
    projectId,
    ownerId: req.user._id,
    next,
  });

  if (!project) return;

  const progress = buildProjectProgress(project);

  const currentTasks = sortTasksForLeader(project.tasks || []).map((task) => ({
    taskId: task._id,
    title: task.title,
    description: task.description,
    priority: task.priority,
    priorityLabel: formatTaskPriority(task.priority),
    status: task.status,
    statusLabel: formatTaskStatus(task.status),
    assignedTo: task.assignedToName,
    assignedToUserId: task.assignedTo,
    deadline: task.deadline,
    canUpdateStatus: true,
    canReassign: true,
  }));

  return successResponse({
    res,
    message: "leader dashboard fetched successfully",
    data: {
      header: {
        projectName: project.title,
        projectStatus: project.status,
        projectStatusLabel: project.status === "ongoing" ? "Active" : project.status,
        clientName: project.clientName || "",
      },
      summary: {
        teamMembersCount: (project.teamMembers || []).length,
        tasksCount: (project.tasks || []).length,
        evaluationsCount: (project.evaluations || []).length,
      },
      currentTasks,
      teamMembers: (project.teamMembers || []).map((member) => ({
        memberId: member._id,
        userId: member.user,
        name: member.name,
        role: member.role,
        level: member.level,
        status: member.status,
        canViewProfile: true,
        canReplace: true,
      })),
      recentEvaluations: (project.evaluations || [])
        .slice(0, 5)
        .map((item) => ({
          evaluationId: item._id,
          memberUser: item.memberUser,
          memberName: item.memberName,
          rating: item.rating,
          comment: item.comment,
          createdAt: item.createdAt,
          ratingStars: Math.round(item.rating),
        })),
      recentActivity: (project.activities || [])
        .slice(0, 10)
        .map((item) => ({
          activityId: item._id,
          type: item.type,
          title: item.title,
          details: item.details,
          actorName: item.actorName,
          createdAt: item.createdAt,
        })),
      progress,
      actions: {
        canAddTask: true,
      },
    },
  });
});

export const getTeamMemberProfile = asyncHandeler(async (req, res, next) => {
  const { projectId, memberUserId } = req.params;

  const project = await getProjectOrThrow({
    projectId,
    userId: req.user._id,
    next,
  });

  if (!project) return;

  const member = (project.teamMembers || []).find(
    (item) => String(item.user) === String(memberUserId)
  );

  if (!member) {
    return next(new Error("team member not found in this project", { cause: 404 }));
  }

  const user = await dbService.findOne({
    model: userModel,
    filter: { _id: memberUserId },
    select: "email role",
  });

  if (!user) {
    return next(new Error("member user not found", { cause: 404 }));
  }

  let profile = null;

  if (user.role === roleEnum.developer) {
    profile = await dbService.findOne({
      model: developerModel,
      filter: { user: memberUserId },
      select: "fullName title bio skills rank yearsExperience profilePicture availability isOnline",
    });
  }

  return successResponse({
    res,
    data: {
      member: {
        userId: memberUserId,
        name: member.name,
        projectRole: member.role,
        status: member.status,
        user,
        profile,
      },
    },
  });
});

export const addTeamMember = asyncHandeler(async (req, res, next) => {
  const { projectId } = req.params;
  const { userId, name, role, level = "mid", status = "offline" } = req.body;

  const project = await getProjectAsOwnerOrThrow({
    projectId,
    ownerId: req.user._id,
    next,
  });

  if (!project) return;

  const exists = (project.teamMembers || []).some(
    (member) => String(member.user) === String(userId)
  );

  if (exists) {
    return next(new Error("team member already exists", { cause: 409 }));
  }

  const updatedProject = await dbService.findOneAndUpdate({
    model: projectModel,
    filter: { _id: projectId },
    data: {
      teamMembers: [
        ...(project.teamMembers || []),
        {
          user: userId,
          name,
          role,
          level,
          status,
        },
      ],
      activities: pushActivity({
        project,
        type: "team",
        title: "Team member added",
        details: `${name} joined the project team as ${role}`,
        actorName: req.user.fullName || req.user.email || "Project Owner",
      }),
    },
  });

  return successResponse({
    res,
    status: 201,
    message: "team member added successfully",
    data: { project: updatedProject },
  });
});

export const addTask = asyncHandeler(async (req, res, next) => {
  const { projectId } = req.params;
  const {
    title,
    description = "",
    priority = "medium",
    assignedTo,
    assignedToName,
    deadline,
    status = "todo",
  } = req.body;

  const project = await getProjectAsOwnerOrThrow({
    projectId,
    ownerId: req.user._id,
    next,
  });

  if (!project) return;

  const assignedExists = (project.teamMembers || []).some(
    (member) => String(member.user) === String(assignedTo)
  );

  if (!assignedExists) {
    return next(new Error("assigned developer is not in project team", { cause: 400 }));
  }

  const updatedProject = await dbService.findOneAndUpdate({
    model: projectModel,
    filter: { _id: projectId },
    data: {
      tasks: [
        ...(project.tasks || []),
        {
          title,
          description,
          priority,
          assignedTo,
          assignedToName,
          deadline,
          status,
        },
      ],
      activities: pushActivity({
        project,
        type: "task",
        title: "Task created",
        details: `${title} assigned to ${assignedToName}`,
        actorName: req.user.fullName || req.user.email || "Project Owner",
      }),
    },
  });

  return successResponse({
    res,
    status: 201,
    message: "task added successfully",
    data: { project: updatedProject },
  });
});

export const updateTaskStatus = asyncHandeler(async (req, res, next) => {
  const { projectId, taskId } = req.params;
  const { status } = req.body;

  const project = await getProjectOrThrow({
    projectId,
    userId: req.user._id,
    next,
  });

  if (!project) return;

  const task = (project.tasks || []).find((item) => String(item._id) === String(taskId));

  if (!task) {
    return next(new Error("task not found", { cause: 404 }));
  }

  const isOwner = String(project.client) === String(req.user._id);
  const isAssigned = String(task.assignedTo) === String(req.user._id);

  if (!isOwner && !isAssigned) {
    return next(new Error("not allowed to update this task", { cause: 403 }));
  }

  const updatedTasks = (project.tasks || []).map((item) => {
    if (String(item._id) === String(taskId)) {
      return {
        ...item.toObject(),
        status,
      };
    }

    return item;
  });

  const updatedProject = await dbService.findOneAndUpdate({
    model: projectModel,
    filter: { _id: projectId },
    data: {
      tasks: updatedTasks,
      activities: pushActivity({
        project,
        type: "task",
        title: "Task status updated",
        details: `${task.title} is now ${status}`,
        actorName: req.user.fullName || req.user.email || "User",
      }),
    },
  });

  return successResponse({
    res,
    message: "task status updated successfully",
    data: {
      project: updatedProject,
      progress: buildProjectProgress(updatedProject),
    },
  });
});

export const reassignTask = asyncHandeler(async (req, res, next) => {
  const { projectId, taskId } = req.params;
  const { assignedTo, assignedToName } = req.body;

  const project = await getProjectAsOwnerOrThrow({
    projectId,
    ownerId: req.user._id,
    next,
  });

  if (!project) return;

  const assignedExists = (project.teamMembers || []).some(
    (member) => String(member.user) === String(assignedTo)
  );

  if (!assignedExists) {
    return next(new Error("assigned developer is not in project team", { cause: 400 }));
  }

  const targetTask = (project.tasks || []).find((item) => String(item._id) === String(taskId));
  if (!targetTask) {
    return next(new Error("task not found", { cause: 404 }));
  }

  const updatedTasks = (project.tasks || []).map((item) => {
    if (String(item._id) === String(taskId)) {
      return {
        ...item.toObject(),
        assignedTo,
        assignedToName,
      };
    }

    return item;
  });

  const updatedProject = await dbService.findOneAndUpdate({
    model: projectModel,
    filter: { _id: projectId },
    data: {
      tasks: updatedTasks,
      activities: pushActivity({
        project,
        type: "task",
        title: "Task reassigned",
        details: `${targetTask.title} reassigned to ${assignedToName}`,
        actorName: req.user.fullName || req.user.email || "Project Owner",
      }),
    },
  });

  return successResponse({
    res,
    message: "task reassigned successfully",
    data: { project: updatedProject },
  });
});

export const addProjectEvaluation = asyncHandeler(async (req, res, next) => {
  const { projectId } = req.params;
  const { memberUser, memberName, rating, comment = "" } = req.body;

  const project = await getProjectAsOwnerOrThrow({
    projectId,
    ownerId: req.user._id,
    next,
  });

  if (!project) return;

  const updatedProject = await dbService.findOneAndUpdate({
    model: projectModel,
    filter: { _id: projectId },
    data: {
      evaluations: [
        {
          memberUser,
          memberName,
          rating,
          comment,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        ...(project.evaluations || []),
      ].slice(0, 50),
      activities: pushActivity({
        project,
        type: "evaluation",
        title: "New evaluation added",
        details: `${memberName} received ${rating} stars`,
        actorName: req.user.fullName || req.user.email || "Project Owner",
      }),
    },
  });

  return successResponse({
    res,
    status: 201,
    message: "evaluation added successfully",
    data: { project: updatedProject },
  });
});

export const getProjectEvaluations = asyncHandeler(async (req, res, next) => {
  const { projectId } = req.params;

  const project = await getProjectOrThrow({
    projectId,
    userId: req.user._id,
    next,
  });

  if (!project) return;

  return successResponse({
    res,
    data: {
      evaluations: (project.evaluations || []).map((item) => ({
        evaluationId: item._id,
        memberUser: item.memberUser,
        memberName: item.memberName,
        rating: item.rating,
        comment: item.comment,
        createdAt: item.createdAt,
      })),
    },
  });
});

export const getProjectActivities = asyncHandeler(async (req, res, next) => {
  const { projectId } = req.params;

  const project = await getProjectOrThrow({
    projectId,
    userId: req.user._id,
    next,
  });

  if (!project) return;

  return successResponse({
    res,
    data: {
      activities: (project.activities || []).map((item) => ({
        activityId: item._id,
        type: item.type,
        title: item.title,
        details: item.details,
        actorName: item.actorName,
        createdAt: item.createdAt,
      })),
    },
  });
});

export const getProjectChatMessages = asyncHandeler(async (req, res, next) => {
  const { projectId } = req.params;

  const project = await getProjectOrThrow({
    projectId,
    userId: req.user._id,
    next,
  });

  if (!project) return;

  return successResponse({
    res,
    data: {
      messages: (project.chatMessages || []).map((msg) => ({
        messageId: msg._id,
        senderName: msg.senderName,
        text: msg.text,
        createdAt: msg.createdAt,
      })),
    },
  });
});

export const addProjectChatMessage = asyncHandeler(async (req, res, next) => {
  const { projectId } = req.params;
  const { text } = req.body;

  const project = await getProjectOrThrow({
    projectId,
    userId: req.user._id,
    next,
  });

  if (!project) return;

  const senderName = req.user.fullName || req.user.email || "User";

  const updatedProject = await dbService.findOneAndUpdate({
    model: projectModel,
    filter: { _id: projectId },
    data: {
      chatMessages: [
        ...(project.chatMessages || []),
        {
          sender: req.user._id,
          senderName,
          text,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      activities: pushActivity({
        project,
        type: "chat",
        title: "New project message",
        details: text.slice(0, 120),
        actorName: senderName,
      }),
    },
  });

  return successResponse({
    res,
    status: 201,
    message: "message sent successfully",
    data: { project: updatedProject },
  });
});

export const getProjectResources = asyncHandeler(async (req, res, next) => {
  const { projectId } = req.params;

  const project = await getProjectOrThrow({
    projectId,
    userId: req.user._id,
    next,
  });

  if (!project) return;

  return successResponse({
    res,
    data: {
      resources: (project.resources || []).map((resource) => ({
        resourceId: resource._id,
        title: resource.title,
        type: resource.type,
        url: resource.url,
        createdAt: resource.createdAt,
      })),
    },
  });
});

export const addProjectResource = asyncHandeler(async (req, res, next) => {
  const { projectId } = req.params;
  const { title, type = "link", url } = req.body;

  const project = await getProjectOrThrow({
    projectId,
    userId: req.user._id,
    next,
  });

  if (!project) return;

  const updatedProject = await dbService.findOneAndUpdate({
    model: projectModel,
    filter: { _id: projectId },
    data: {
      resources: [
        ...(project.resources || []),
        {
          title,
          type,
          url,
          uploadedBy: req.user._id,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      activities: pushActivity({
        project,
        type: "resource",
        title: "Resource added",
        details: `${title} (${type})`,
        actorName: req.user.fullName || req.user.email || "User",
      }),
    },
  });

  return successResponse({
    res,
    status: 201,
    message: "resource added successfully",
    data: { project: updatedProject },
  });
});

export const askProjectAssistant = asyncHandeler(async (req, res, next) => {
  const { projectId } = req.params;
  const { question } = req.body;

  const project = await getProjectOrThrow({
    projectId,
    userId: req.user._id,
    next,
  });

  if (!project) return;

  const progress = buildProjectProgress(project);
  const tasks = project.tasks || [];
  const todoTasks = tasks.filter((task) => task.status === "todo").length;
  const inProgressTasks = tasks.filter((task) => task.status === "in-progress").length;

  const responseText = [
    `Project: ${project.title}`,
    `Current stage: ${project.currentStage || "Planning"}`,
    `Progress: ${progress.completedTasks}/${progress.totalTasks} tasks completed (${progress.progressPercent}%).`,
    `Open tasks: ${todoTasks} todo, ${inProgressTasks} in-progress.`,
    `Question received: ${question}`,
    "Suggested next step: prioritize in-progress tasks with nearest deadline, then move todo items into active execution.",
  ].join(" ");

  return successResponse({
    res,
    message: "project assistant response generated",
    data: {
      answer: responseText,
      context: {
        projectName: project.title,
        currentStage: project.currentStage || "Planning",
        progress,
      },
    },
  });
});

export const previewClientJobPost = asyncHandeler(async (req, res, next) => {
  if (!assertClientRole({ req, next, actionLabel: "preview this job post" })) {
    return;
  }

  const preview = normalizeJobPostPayload(req.body);

  return successResponse({
    res,
    message: "job preview generated successfully",
    data: {
      preview,
    },
  });
});

export const publishClientJobPost = asyncHandeler(async (req, res, next) => {
  if (!assertClientRole({ req, next, actionLabel: "publish this job post" })) {
    return;
  }

  const jobPayload = normalizeJobPostPayload(req.body);

  const [job] = await dbService.create({
    model: jobModel,
    data: [
      {
        company: req.user._id,
        ...jobPayload,
        publicationStatus: "published",
      },
    ],
  });

  return successResponse({
    res,
    status: 201,
    message: "job published successfully",
    data: { job: formatJobPostPayload(job) },
  });
});

export const saveJobDraft = asyncHandeler(async (req, res, next) => {
  if (!assertClientRole({ req, next, actionLabel: "save job drafts" })) {
    return;
  }

  const jobPayload = normalizeJobPostPayload(req.body);

  const [job] = await dbService.create({
    model: jobModel,
    data: [
      {
        company: req.user._id,
        ...jobPayload,
        publicationStatus: "draft",
      },
    ],
  });

  return successResponse({
    res,
    status: 201,
    message: "job draft saved successfully",
    data: { job: formatJobPostPayload(job) },
  });
});

export const getJobDraftDetails = asyncHandeler(async (req, res, next) => {
  if (!assertClientRole({ req, next, actionLabel: "view job drafts" })) {
    return;
  }

  const { jobId } = req.params;
  const job = await getClientJobOrThrow({
    jobId,
    userId: req.user._id,
    publicationStatus: "draft",
    next,
  });

  if (!job) return;

  return successResponse({
    res,
    message: "job draft fetched successfully",
    data: { job: formatJobPostPayload(job) },
  });
});

export const updateJobDraft = asyncHandeler(async (req, res, next) => {
  if (!assertClientRole({ req, next, actionLabel: "update job drafts" })) {
    return;
  }

  const { jobId } = req.params;
  const existingJob = await getClientJobOrThrow({
    jobId,
    userId: req.user._id,
    publicationStatus: "draft",
    next,
  });

  if (!existingJob) return;

  const mergedBody = {
    title: req.body.title ?? existingJob.title,
    description: req.body.description ?? existingJob.description,
    skills: req.body.skills ?? existingJob.skills,
    teamSize: req.body.teamSize ?? existingJob.teamSize,
    budget: req.body.budget ?? existingJob.budget,
    deadline: req.body.deadline ?? existingJob.deadline,
    estimatedDuration: req.body.estimatedDuration ?? existingJob.estimatedDuration,
    workType: req.body.workType ?? existingJob.workType,
    priority: req.body.priority ?? existingJob.priority,
    workMode: req.body.workMode ?? existingJob.workMode,
  };

  const jobPayload = normalizeJobPostPayload(mergedBody);

  const job = await dbService.findOneAndUpdate({
    model: jobModel,
    filter: { _id: jobId, company: req.user._id, publicationStatus: "draft" },
    data: {
      ...jobPayload,
    },
  });

  return successResponse({
    res,
    message: "job draft updated successfully",
    data: { job: formatJobPostPayload(job) },
  });
});

export const publishJobDraft = asyncHandeler(async (req, res, next) => {
  if (!assertClientRole({ req, next, actionLabel: "publish job drafts" })) {
    return;
  }

  const { jobId } = req.params;
  const job = await getClientJobOrThrow({
    jobId,
    userId: req.user._id,
    publicationStatus: "draft",
    next,
  });

  if (!job) return;

  const published = await dbService.findOneAndUpdate({
    model: jobModel,
    filter: { _id: jobId, company: req.user._id, publicationStatus: "draft" },
    data: {
      publicationStatus: "published",
      status: "active",
    },
  });

  return successResponse({
    res,
    message: "job draft published successfully",
    data: { job: formatJobPostPayload(published) },
  });
});

export const getMyJobPosts = asyncHandeler(async (req, res, next) => {
  if (!assertClientRole({ req, next, actionLabel: "view their job posts" })) {
    return;
  }

  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 10);
  const skip = (page - 1) * limit;

  const filter = { company: req.user._id, publicationStatus: "published" };

  const [jobs, totalCount, totalApplications, appliedProjectCount] = await Promise.all([
    jobModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    jobModel.countDocuments(filter),
    jobModel.aggregate([
      { $match: { company: req.user._id, publicationStatus: "published" } },
      { $group: { _id: null, total: { $sum: "$applicationsCount" } } },
    ]),
    jobModel.countDocuments({
      company: req.user._id,
      publicationStatus: "published",
      applicationsCount: { $gt: 0 },
    }),
  ]);

  return successResponse({
    res,
    message: "my job posts fetched successfully",
    data: {
      items: jobs.map(formatMyJobCard),
      stats: {
        totalPosts: totalCount,
        appliedProject: appliedProjectCount,
        totalApplication: totalApplications?.[0]?.total || 0,
      },
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit) || 1,
      },
    },
  });
});

export const getMyJobPostDetails = asyncHandeler(async (req, res, next) => {
  if (!assertClientRole({ req, next, actionLabel: "view job details" })) {
    return;
  }

  const { jobId } = req.params;
  const job = await getClientJobOrThrow({
    jobId,
    userId: req.user._id,
    next,
  });

  if (!job) return;

  const applications = await applicationModel
    .find({ job: jobId, company: req.user._id })
    .populate([{ path: "developer", select: "email" }])
    .sort({ createdAt: -1 })
    .limit(4);

  const developerIds = applications.map((item) => item.developer?._id).filter(Boolean);
  const profiles = await developerModel.find({ user: { $in: developerIds } });
  const profileMap = new Map(profiles.map((profile) => [String(profile.user), profile]));

  const applicants = applications.map((item) => {
    const developerId = String(item.developer?._id || "");
    const profile = profileMap.get(developerId);

    return {
      applicationId: item._id,
      developerId: item.developer?._id || null,
      name: profile?.fullName || "Unknown Developer",
      title: profile?.title || "",
      profilePicture: profile?.profilePicture?.url || "",
      status: item.status,
      statusLabel: formatApplicantStatusLabel(item.status),
      proposedBudget: item.proposedBudget,
      appliedAt: item.createdAt,
      skills: profile?.skills || [],
      actions: {
        viewProfile: `/client/developers/${item.developer?._id || ""}/profile`,
        updateStatus: `/client/job/${job._id}/applicants/${item._id}/status`,
      },
    };
  });

  return successResponse({
    res,
    message: "job details fetched successfully",
    data: {
      header: {
        title: job.title,
        status: job.status,
        statusLabel: job.status === "active" ? "Active" : mapJobStatusLabel(job.status),
        postedAt: job.createdAt,
      },
      summaryCards: {
        salary: formatBudgetLabel(job),
        location: job.location || job.workMode || "",
        type: formatJobTypeLabel(job),
        deadline: job.deadline || null,
      },
      jobInfo: {
        jobId: job._id,
        title: job.title,
        description: job.description,
        requirements: job.requirements || "",
        skills: job.skills || [],
        budget: job.budget,
        budgetMin: job.budgetMin,
        budgetMax: job.budgetMax,
        salaryLabel: formatBudgetLabel(job),
        location: job.location || job.workMode || "",
        workMode: job.workMode,
        type: job.type,
        typeLabel: formatJobTypeLabel(job),
        workType: job.workType,
        deadline: job.deadline,
        postedAt: job.createdAt,
        estimatedDuration: job.estimatedDuration || "",
        teamSize: job.teamSize,
      },
      stats: {
        numberOfApplicants: job.applicationsCount || 0,
        status: job.status,
        statusLabel: mapJobStatusLabel(job.status),
      },
      applicants: {
        total: job.applicationsCount || applicants.length,
        preview: applicants,
        actions: {
          viewAll: `/client/job/${job._id}/applicants`,
          buildTeamFromApplicants: `/client/job/${job._id}/build-team`,
        },
      },
      actions: {
        canViewApplicants: true,
        canCloseJob: true,
        canEditJob: true,
        viewApplicants: `/client/job/${job._id}/applicants`,
        buildTeamFromApplicants: `/client/job/${job._id}/build-team`,
        closeJob: `/client/jobs/my-posts/${job._id}/close`,
        editJob: `/client/jobs/my-posts/${job._id}`,
      },
    },
  });
});

export const updateMyJobPost = asyncHandeler(async (req, res, next) => {
  if (!assertClientRole({ req, next, actionLabel: "edit job posts" })) {
    return;
  }

  const { jobId } = req.params;
  const existingJob = await getClientJobOrThrow({
    jobId,
    userId: req.user._id,
    next,
  });

  if (!existingJob) return;

  const mergedBody = {
    title: req.body.title ?? existingJob.title,
    description: req.body.description ?? existingJob.description,
    skills: req.body.skills ?? existingJob.skills,
    teamSize: req.body.teamSize ?? existingJob.teamSize,
    budget: req.body.budget ?? existingJob.budget,
    deadline: req.body.deadline ?? existingJob.deadline,
    estimatedDuration: req.body.estimatedDuration ?? existingJob.estimatedDuration,
    workType: req.body.workType ?? existingJob.workType,
    priority: req.body.priority ?? existingJob.priority,
    workMode: req.body.workMode ?? existingJob.workMode,
  };

  const jobPayload = normalizeJobPostPayload(mergedBody);

  const job = await dbService.findOneAndUpdate({
    model: jobModel,
    filter: { _id: jobId, company: req.user._id },
    data: {
      ...jobPayload,
    },
  });

  return successResponse({
    res,
    message: "job post updated successfully",
    data: { job: formatJobPostPayload(job) },
  });
});

export const updateMyJobPostStatus = asyncHandeler(async (req, res, next) => {
  if (!assertClientRole({ req, next, actionLabel: "change job status" })) {
    return;
  }

  const { jobId } = req.params;
  const { status } = req.body;

  const existingJob = await getClientJobOrThrow({
    jobId,
    userId: req.user._id,
    next,
  });

  if (!existingJob) return;

  const updatedJob = await dbService.findOneAndUpdate({
    model: jobModel,
    filter: { _id: jobId, company: req.user._id },
    data: { status },
  });

  return successResponse({
    res,
    message: "job status updated successfully",
    data: { job: formatJobPostPayload(updatedJob) },
  });
});

export const deleteMyJobPost = asyncHandeler(async (req, res, next) => {
  if (!assertClientRole({ req, next, actionLabel: "delete job posts" })) {
    return;
  }

  const { jobId } = req.params;
  const existingJob = await getClientJobOrThrow({
    jobId,
    userId: req.user._id,
    next,
  });

  if (!existingJob) return;

  await dbService.deleteOne({
    model: jobModel,
    filter: { _id: jobId, company: req.user._id },
  });

  return successResponse({
    res,
    message: "job post deleted successfully",
  });
});

export const closeMyJobPost = asyncHandeler(async (req, res, next) => {
  if (!assertClientRole({ req, next, actionLabel: "close job posts" })) {
    return;
  }

  const { jobId } = req.params;
  const existingJob = await getClientJobOrThrow({
    jobId,
    userId: req.user._id,
    next,
  });

  if (!existingJob) return;

  const updatedJob = await dbService.findOneAndUpdate({
    model: jobModel,
    filter: { _id: jobId, company: req.user._id },
    data: { status: "closed" },
  });

  return successResponse({
    res,
    message: "job closed successfully",
    data: {
      job: {
        jobId: updatedJob._id,
        status: updatedJob.status,
        statusLabel: mapJobStatusLabel(updatedJob.status),
      },
    },
  });
});

export const getMyJobApplicants = asyncHandeler(async (req, res, next) => {
  if (!assertClientRole({ req, next, actionLabel: "view job applicants" })) {
    return;
  }

  const { jobId } = req.params;
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 10);
  const skip = (page - 1) * limit;

  const job = await getClientJobOrThrow({
    jobId,
    userId: req.user._id,
    next,
  });

  if (!job) return;

  const [applications, totalCount, totalPendingForJob] = await Promise.all([
    applicationModel
      .find({ job: jobId, company: req.user._id })
      .populate([{ path: "developer", select: "email" }])
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    applicationModel.countDocuments({ job: jobId, company: req.user._id }),
    applicationModel.countDocuments({ job: jobId, company: req.user._id, status: "pending" }),
  ]);

  const developerIds = applications.map((item) => item.developer?._id).filter(Boolean);

  const [profiles, ratings] = await Promise.all([
    developerModel.find({ user: { $in: developerIds } }),
    ratingModel.aggregate([
      { $match: { developer: { $in: developerIds } } },
      {
        $group: {
          _id: "$developer",
          average: { $avg: "$overall" },
        },
      },
    ]),
  ]);

  const profileMap = new Map(profiles.map((profile) => [String(profile.user), profile]));
  const ratingMap = new Map(ratings.map((item) => [String(item._id), item.average]));

  return successResponse({
    res,
    message: "job applicants fetched successfully",
    data: {
      stats: {
        totalPending: totalPendingForJob,
      },
      applicants: applications.map((item) => ({
        applicationId: item._id,
        status: item.status,
        proposedBudget: item.proposedBudget,
        submittedAt: item.createdAt,
        developer: {
          userId: item.developer?._id || null,
          name:
            profileMap.get(String(item.developer?._id || ""))?.fullName || "Unknown Developer",
          rank:
            profileMap.get(String(item.developer?._id || ""))?.rank || "Bronze",
          rankScore: Number(
            (ratingMap.get(String(item.developer?._id || "")) || 0).toFixed(1)
          ),
          skills: profileMap.get(String(item.developer?._id || ""))?.skills || [],
          email: item.developer?.email || "",
          profile: {
            title: profileMap.get(String(item.developer?._id || ""))?.title || "",
          },
        },
        actions: {
          canAccept: item.status === "pending",
          canReject: item.status === "pending",
          canViewProfile: true,
        },
      })),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit) || 1,
      },
    },
  });
});

export const buildTeamFromMyJobApplicants = asyncHandeler(async (req, res, next) => {
  if (!assertClientRole({ req, next, actionLabel: "build team from applicants" })) {
    return;
  }

  const { jobId } = req.params;
  const { applicationIds = [], closeJob = true, projectTitle = "" } = req.body;

  const job = await getClientJobOrThrow({
    jobId,
    userId: req.user._id,
    next,
  });

  if (!job) return;

  const filter = {
    job: jobId,
    company: req.user._id,
    ...(applicationIds.length
      ? { _id: { $in: applicationIds } }
      : { status: { $in: ["shortlisted", "interviewed", "accepted"] } }),
  };

  const selectedApplications = await applicationModel
    .find(filter)
    .populate([{ path: "developer", select: "email" }]);

  if (!selectedApplications.length) {
    return next(new Error("no selected applicants found", { cause: 404 }));
  }

  const selectedApplicationIds = selectedApplications.map((item) => item._id);
  await applicationModel.updateMany(
    { _id: { $in: selectedApplicationIds }, job: jobId, company: req.user._id },
    { status: "accepted" }
  );

  if (closeJob) {
    await dbService.findOneAndUpdate({
      model: jobModel,
      filter: { _id: jobId, company: req.user._id },
      data: { status: "closed" },
    });
  }

  const developerIds = selectedApplications
    .map((application) => application.developer?._id)
    .filter(Boolean);

  const profiles = await developerModel.find({ user: { $in: developerIds } });
  const profileMap = new Map(profiles.map((profile) => [String(profile.user), profile]));

  const teamMembers = selectedApplications.map((application) => {
    const developerId = String(application.developer?._id || "");
    const profile = profileMap.get(developerId);

    return {
      user: application.developer?._id,
      name: profile?.fullName || "Unknown Developer",
      role: profile?.title || "Developer",
      level: profile?.experienceLevel || "mid",
      status: profile?.isOnline ? "online" : "offline",
    };
  });

  const [project] = await dbService.create({
    model: projectModel,
    data: [
      {
        client: req.user._id,
        clientName: req.user.email || "Client",
        title: projectTitle || job.title,
        description: job.description || "",
        requiredSkills: job.skills || [],
        developerRole: "Team",
        deadline: job.deadline || null,
        currentStage: "Team Confirmed",
        teamMembers,
        teamSize: teamMembers.length,
        activities: [
          {
            type: "team",
            title: "Team built from applicants",
            details: `Approved ${teamMembers.length} applicants for ${job.title}.`,
            actorName: req.user.email || "Client",
          },
        ],
      },
    ],
  });

  return successResponse({
    res,
    status: 201,
    message: "team built from applicants successfully",
    data: {
      project: {
        projectId: project._id,
        title: project.title,
        teamSize: project.teamSize,
        status: project.status,
      },
      job: {
        jobId: job._id,
        title: job.title,
        status: closeJob ? "closed" : job.status,
      },
      teamMembers: selectedApplications.map((application) => {
        const developerId = String(application.developer?._id || "");
        const profile = profileMap.get(developerId);

        return {
          applicationId: application._id,
          developerId: application.developer?._id || null,
          name: profile?.fullName || "Unknown Developer",
          title: profile?.title || "Developer",
          email: application.developer?.email || "",
          skills: profile?.skills || [],
          status: "accepted",
        };
      }),
      totalMembers: teamMembers.length,
      actions: {
        projectDetails: `/projects/${project._id}`,
      },
    },
  });
});

export const updateMyJobApplicantStatus = asyncHandeler(async (req, res, next) => {
  if (!assertClientRole({ req, next, actionLabel: "update applicant status" })) {
    return;
  }

  const { jobId, applicationId } = req.params;
  const { status } = req.body;

  const job = await getClientJobOrThrow({
    jobId,
    userId: req.user._id,
    next,
  });

  if (!job) return;

  const application = await dbService.findOne({
    model: applicationModel,
    filter: { _id: applicationId, job: jobId, company: req.user._id },
  });

  if (!application) {
    return next(new Error("application not found", { cause: 404 }));
  }

  const updated = await dbService.findOneAndUpdate({
    model: applicationModel,
    filter: { _id: applicationId, job: jobId, company: req.user._id },
    data: { status },
  });

  return successResponse({
    res,
    message: `application ${status} successfully`,
    data: {
      application: {
        applicationId: updated._id,
        status: updated.status,
      },
    },
  });
});
