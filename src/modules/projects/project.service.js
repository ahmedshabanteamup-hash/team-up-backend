import { projectModel } from "../../DB/models/project.model.js";
import { jobModel } from "../../DB/models/jop.model.js";
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
  const progressPercent = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  return {
    progressPercent,
    completedTasks,
    totalTasks,
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

const normalizeJobPostPayload = (body) => {
  const {
    title,
    description,
    skills,
    budget,
    estimatedDuration,
    workType,
    workMode = "remote",
  } = body;

  const normalizedType = workType === "full-time" ? "full-time" : "contract";

  return {
    title,
    description,
    skills,
    budget,
    budgetMin: budget,
    budgetMax: budget,
    estimatedDuration,
    workType,
    type: normalizedType,
    workMode,
  };
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

  return successResponse({
    res,
    message: "project details fetched successfully",
    data: {
      header: {
        projectName: project.title,
        projectStatus: project.status,
        clientName: project.clientName || "",
        deadline: project.deadline,
      },
      overview: {
        description: project.description,
        requiredSkills: project.requiredSkills || [],
        developerRole: project.developerRole || "",
        startDate: project.startDate,
        deadline: project.deadline,
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
        assignedTo: task.assignedToName,
        deadline: task.deadline,
        status: task.status,
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
    status: task.status,
    assignedTo: task.assignedToName,
    deadline: task.deadline,
  }));

  return successResponse({
    res,
    message: "leader dashboard fetched successfully",
    data: {
      header: {
        projectName: project.title,
        projectStatus: project.status,
        clientName: project.clientName || "",
      },
      currentTasks,
      teamMembers: (project.teamMembers || []).map((member) => ({
        memberId: member._id,
        userId: member.user,
        name: member.name,
        role: member.role,
        level: member.level,
        status: member.status,
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
  if (req.user.role !== roleEnum.client) {
    return next(new Error("only client can preview this job post", { cause: 403 }));
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
  if (req.user.role !== roleEnum.client) {
    return next(new Error("only client can publish this job post", { cause: 403 }));
  }

  const jobPayload = normalizeJobPostPayload(req.body);

  const [job] = await dbService.create({
    model: jobModel,
    data: [
      {
        company: req.user._id,
        ...jobPayload,
      },
    ],
  });

  return successResponse({
    res,
    status: 201,
    message: "job published successfully",
    data: { job },
  });
});
