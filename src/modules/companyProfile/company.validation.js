import joi from "joi";
import { generalFields } from "../../middelware/validation.middelware.js";

export const createJobSchema = {
  body: joi
    .object({
      title: joi.string().min(3).max(100).required(),
      description: joi.string().min(10).required(),
      requirements: joi.string().allow("").max(2000).optional(),
      type: joi.string().valid("full-time", "part-time", "contract").required(),
      workType: joi.string().valid("freelance-contract", "full-time").optional(),
      workMode: joi.string().valid("remote", "onsite", "hybrid").required(),
      location: joi.string().min(2).max(120).allow("").optional(),
      skills: joi.array().items(joi.string()).optional(),
      experienceLevel: joi.string().valid("junior", "mid", "senior").optional(),
      budget: joi.number().min(0).optional(),
      budgetMin: joi.number().min(0).optional(),
      budgetMax: joi.number().min(0).optional(),
      estimatedDuration: joi.string().max(100).allow("").optional(),
      deadline: joi.date().optional(),
      teamSize: joi.number().min(1).optional(),
      publicationStatus: joi.string().valid("draft", "published").optional(),
    })
    .required(),
};

export const updateJobStatusSchema = {
  params: joi
    .object({
      jobId: generalFields.id.required(),
    })
    .required(),
  body: joi
    .object({
      status: joi.string().valid("active", "closed").required(),
    })
    .required(),
};

export const updateCompanyProfileSchema = {
  body: joi
    .object({
      companyName: joi.string().min(2).max(100).optional(),
      companySize: joi.string().min(2).max(100).optional(),
      industry: joi.string().min(2).max(100).optional(),
      website: joi.string().uri().optional(),
      contactEmail: joi.string().email().optional(),
      location: joi.string().min(2).max(100).optional(),
    })
    .required(),
};

export const updateCompanyAboutSchema = {
  body: joi
    .object({
      description: joi.string().max(2000).optional(),
      projectTypes: joi.array().items(joi.string().min(2).max(100)).optional(),
    })
    .required(),
};

export const createInterviewSchema = {
  body: joi
    .object({
      candidateName: joi.string().min(2).max(100).required(),
      jobTitle: joi.string().min(2).max(100).required(),
      interviewType: joi.string().valid("technical", "hr", "final").optional(),
      mode: joi.string().valid("remote", "onsite", "hybrid").optional(),
      scheduledAt: joi.date().required(),
    })
    .required(),
};

export const updateInterviewSchema = {
  params: joi
    .object({
      interviewId: generalFields.id.required(),
    })
    .required(),
  body: joi
    .object({
      status: joi.string().valid("upcoming", "passed", "cancelled").optional(),
      feedback: joi.string().allow("").max(2000).optional(),
      scheduledAt: joi.date().optional(),
      mode: joi.string().valid("remote", "onsite", "hybrid").optional(),
      interviewType: joi.string().valid("technical", "hr", "final").optional(),
    })
    .min(1)
    .required(),
};

export const jobIdParamSchema = {
  params: joi
    .object({
      jobId: generalFields.id.required(),
    })
    .required(),
};

export const updateJobSchema = {
  params: joi
    .object({
      jobId: generalFields.id.required(),
    })
    .required(),
  body: joi
    .object({
      title: joi.string().min(3).max(100).optional(),
      description: joi.string().min(10).optional(),
      requirements: joi.string().allow("").max(2000).optional(),
      type: joi.string().valid("full-time", "part-time", "contract").optional(),
      workType: joi.string().valid("freelance-contract", "full-time").optional(),
      workMode: joi.string().valid("remote", "onsite", "hybrid").optional(),
      location: joi.string().min(2).max(120).allow("").optional(),
      skills: joi.array().items(joi.string()).optional(),
      experienceLevel: joi.string().valid("junior", "mid", "senior").optional(),
      budget: joi.number().min(0).optional(),
      budgetMin: joi.number().min(0).optional(),
      budgetMax: joi.number().min(0).optional(),
      estimatedDuration: joi.string().max(100).allow("").optional(),
      deadline: joi.date().optional(),
      teamSize: joi.number().min(1).optional(),
      publicationStatus: joi.string().valid("draft", "published").optional(),
    })
    .min(1)
    .required(),
};

export const getApplicantsSchema = {
  params: joi
    .object({
      jobId: generalFields.id.required(),
    })
    .required(),
  query: joi
    .object({
      page: joi.number().min(1).optional(),
      limit: joi.number().min(1).max(100).optional(),
      status: joi
        .string()
        .valid("pending", "shortlisted", "interviewed", "accepted", "rejected")
        .optional(),
    })
    .required(),
};

export const getMyJobPostsSchema = {
  query: joi
    .object({
      page: joi.number().min(1).optional(),
      limit: joi.number().min(1).max(100).optional(),
      search: joi.string().allow("").max(100).optional(),
      status: joi.string().valid("active", "closed").optional(),
    })
    .required(),
};

export const getCompanyApplicantsListSchema = {
  query: joi
    .object({
      page: joi.number().min(1).optional(),
      limit: joi.number().min(1).max(100).optional(),
      search: joi.string().allow("").max(100).optional(),
      skills: joi.string().allow("").max(100).optional(),
      rank: joi.string().allow("").max(50).optional(),
      experience: joi.string().valid("all", "junior", "mid", "senior").optional(),
      status: joi
        .string()
        .valid(
          "all",
          "new",
          "pending",
          "shortlisted",
          "interviewed",
          "interviewing",
          "accepted",
          "rejected"
        )
        .optional(),
    })
    .required(),
};

export const updateApplicationStatusSchema = {
  params: joi
    .object({
      applicationId: generalFields.id.required(),
    })
    .required(),
  body: joi
    .object({
      status: joi
        .string()
        .valid("pending", "shortlisted", "interviewed", "accepted", "rejected")
        .required(),
    })
    .required(),
};

export const developerIdParamSchema = {
  params: joi
    .object({
      developerId: generalFields.id.required(),
    })
    .required(),
};

export const buildTeamFromApplicantsSchema = {
  params: joi
    .object({
      jobId: generalFields.id.required(),
    })
    .required(),
  body: joi
    .object({
      applicationIds: joi.array().items(generalFields.id).min(1).optional(),
      closeJob: joi.boolean().optional(),
    })
    .required(),
};
