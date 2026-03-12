import joi from "joi";
import { generalFields } from "../../middelware/validation.middelware.js";

const jobTypeEnum = ["freelance", "full-time", "part-time", "contract"];

export const createDeveloperProfile = {
  body: joi
    .object({
      fullName: joi.string().min(2).max(100).required(),
      bio: joi.string().max(500).allow("").optional(),
      skills: joi.array().items(joi.string().min(1)).min(1).required(),
      title: joi.string().max(100).optional(),
      yearsExperience: joi.number().min(0).optional(),
      specialization: joi
        .string()
        .valid("frontend", "backend", "fullstack", "ai", "ui", "embedded")
        .optional(),
      experienceLevel: joi.string().valid("junior", "mid", "senior").optional(),
    })
    .required(),
};

export const updateDeveloperProfile = {
  body: joi
    .object({
      fullName: joi.string().min(2).max(100).optional(),
      bio: joi.string().max(500).allow("").optional(),
      title: joi.string().max(100).optional(),
      yearsExperience: joi.number().min(0).optional(),
      specialization: joi
        .string()
        .valid("frontend", "backend", "fullstack", "ai", "ui", "embedded")
        .optional(),
      experienceLevel: joi.string().valid("junior", "mid", "senior").optional(),
      availability: joi.string().valid("available", "busy", "offline").optional(),
      isOnline: joi.boolean().optional(),
      githubUrl: joi.string().uri().allow("").optional(),
    })
    .required(),
};

export const replaceSkills = {
  body: joi
    .object({
      skills: joi.array().items(joi.string().min(1)).required(),
    })
    .required(),
};

export const addSkill = {
  body: joi
    .object({
      skill: joi.string().min(1).required(),
    })
    .required(),
};

export const removeSkill = {
  params: joi
    .object({
      skill: joi.string().min(1).required(),
    })
    .required(),
};

export const addPortfolioItem = {
  body: joi
    .object({
      title: joi.string().min(3).required(),
      description: joi.string().min(10).required(),
      technologies: joi.array().items(joi.string()).optional(),
      roleInProject: joi.string().allow("").optional(),
      projectUrl: joi.string().uri().allow("").optional(),
      githubUrl: joi.string().uri().allow("").optional(),
    })
    .required(),
};

export const updatePortfolioItem = {
  params: joi
    .object({
      itemId: generalFields.id.required(),
    })
    .required(),
  body: joi
    .object({
      title: joi.string().min(3).optional(),
      description: joi.string().min(10).optional(),
      technologies: joi.array().items(joi.string()).optional(),
      roleInProject: joi.string().allow("").optional(),
      projectUrl: joi.string().uri().allow("").optional(),
      githubUrl: joi.string().uri().allow("").optional(),
    })
    .required(),
};

export const deletePortfolioItem = {
  params: joi
    .object({
      itemId: generalFields.id.required(),
    })
    .required(),
};

export const addWorkHistoryItem = {
  body: joi
    .object({
      projectTitle: joi.string().min(2).required(),
      clientName: joi.string().min(2).required(),
      role: joi.string().min(2).required(),
      duration: joi.string().allow("").optional(),
      months: joi.number().min(0).optional(),
      status: joi.string().valid("ongoing", "completed").optional(),
      rating: joi.number().min(0).max(5).optional(),
    })
    .required(),
};

export const updateAvailability = {
  body: joi
    .object({
      workingHours: joi.string().max(100).optional(),
      preferredJobTypes: joi.array().items(joi.string().valid(...jobTypeEnum)).optional(),
      salaryExpectation: joi.string().max(100).allow("").optional(),
      acceptingNewProjects: joi.boolean().optional(),
    })
    .required(),
};

export const changePassword = {
  body: joi
    .object({
      oldPassword: joi.string().required(),
      newPassword: joi
        .string()
        .pattern(new RegExp(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/))
        .required(),
    })
    .required(),
};
