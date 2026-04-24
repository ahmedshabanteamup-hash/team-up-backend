import joi from "joi";
import { generalFields } from "../../middelware/validation.middelware.js";

export const createProject = {
  body: joi.object({
    title: joi.string().min(3).max(100).required(),
    description: joi.string().allow("").optional(),
    teamSize: joi.number().min(0).optional(),
    requiredSkills: joi.array().items(joi.string()).optional(),
    developerRole: joi.string().allow("").optional(),
    clientName: joi.string().allow("").optional(),
    startDate: joi.date().optional(),
    deadline: joi.date().optional(),
    currentStage: joi.string().allow("").optional(),
  }),
};

export const projectIdParam = {
  params: joi.object({
    projectId: generalFields.id.required(),
  }),
};

export const teamMemberProfileParam = {
  params: joi.object({
    projectId: generalFields.id.required(),
    memberUserId: generalFields.id.required(),
  }),
};

export const addTeamMember = {
  params: joi.object({
    projectId: generalFields.id.required(),
  }),
  body: joi.object({
    userId: generalFields.id.required(),
    name: joi.string().min(2).max(100).required(),
    role: joi.string().min(2).max(100).required(),
    level: joi.string().min(2).max(40).optional(),
    status: joi.string().valid("online", "offline").optional(),
  }),
};

export const addTask = {
  params: joi.object({
    projectId: generalFields.id.required(),
  }),
  body: joi.object({
    title: joi.string().min(3).max(150).required(),
    description: joi.string().allow("").optional(),
    priority: joi.string().valid("low", "medium", "high").optional(),
    assignedTo: generalFields.id.required(),
    assignedToName: joi.string().min(2).max(100).required(),
    deadline: joi.date().required(),
    status: joi.string().valid("todo", "in-progress", "done").optional(),
  }),
};

export const updateTaskStatus = {
  params: joi.object({
    projectId: generalFields.id.required(),
    taskId: generalFields.id.required(),
  }),
  body: joi.object({
    status: joi.string().valid("todo", "in-progress", "done").required(),
  }),
};

export const reassignTask = {
  params: joi.object({
    projectId: generalFields.id.required(),
    taskId: generalFields.id.required(),
  }),
  body: joi.object({
    assignedTo: generalFields.id.required(),
    assignedToName: joi.string().min(2).max(100).required(),
  }),
};

export const addProjectEvaluation = {
  params: joi.object({
    projectId: generalFields.id.required(),
  }),
  body: joi.object({
    memberUser: generalFields.id.required(),
    memberName: joi.string().min(2).max(100).required(),
    rating: joi.number().min(1).max(5).required(),
    comment: joi.string().allow("").optional(),
  }),
};

export const addProjectMessage = {
  params: joi.object({
    projectId: generalFields.id.required(),
  }),
  body: joi.object({
    text: joi.string().min(1).max(2000).required(),
  }),
};

export const addProjectResource = {
  params: joi.object({
    projectId: generalFields.id.required(),
  }),
  body: joi.object({
    title: joi.string().min(2).max(120).required(),
    type: joi.string().valid("file", "link", "doc").optional(),
    url: joi.string().uri().required(),
  }),
};

export const askProjectAssistant = {
  params: joi.object({
    projectId: generalFields.id.required(),
  }),
  body: joi.object({
    question: joi.string().min(2).max(4000).required(),
  }),
};

export const previewJobPost = {
  body: joi.object({
    title: joi.string().min(3).max(150).required(),
    description: joi.string().min(10).required(),
    skills: joi.array().items(joi.string().min(1)).min(1).required(),
    budget: joi.number().min(0).required(),
    estimatedDuration: joi.string().min(1).max(100).required(),
    workType: joi.string().valid("freelance-contract", "full-time").required(),
    workMode: joi.string().valid("remote", "onsite", "hybrid").optional(),
  }),
};
