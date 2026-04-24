import joi from "joi";
import { generalFields } from "../../middelware/validation.middelware.js";

export const createJobSchema = {
  body: joi
    .object({
      title: joi.string().min(3).max(100).required(),
      description: joi.string().min(10).required(),
      type: joi.string().valid("full-time", "part-time", "contract").required(),
      workType: joi.string().valid("freelance-contract", "full-time").optional(),
      workMode: joi.string().valid("remote", "onsite", "hybrid").required(),
      location: joi.string().min(2).max(120).allow("").optional(),
      skills: joi.array().items(joi.string()).optional(),
      budget: joi.number().min(0).optional(),
      budgetMin: joi.number().min(0).optional(),
      budgetMax: joi.number().min(0).optional(),
      estimatedDuration: joi.string().max(100).allow("").optional(),
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
      type: joi.string().valid("full-time", "part-time", "contract").optional(),
      workType: joi.string().valid("freelance-contract", "full-time").optional(),
      workMode: joi.string().valid("remote", "onsite", "hybrid").optional(),
      location: joi.string().min(2).max(120).allow("").optional(),
      skills: joi.array().items(joi.string()).optional(),
      budget: joi.number().min(0).optional(),
      budgetMin: joi.number().min(0).optional(),
      budgetMax: joi.number().min(0).optional(),
      estimatedDuration: joi.string().max(100).allow("").optional(),
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
      status: joi.string().valid("pending", "accepted", "rejected").optional(),
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
      status: joi.string().valid("accepted", "rejected").required(),
    })
    .required(),
};
