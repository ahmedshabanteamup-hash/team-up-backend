import joi from "joi";
import { generalFields } from "../../middelware/validation.middelware.js";

export const createJobSchema = {
  body: joi
    .object({
      title: joi.string().min(3).max(100).required(),
      description: joi.string().min(10).required(),
      type: joi.string().valid("full-time", "part-time", "contract").required(),
      workMode: joi.string().valid("remote", "onsite", "hybrid").required(),
      skills: joi.array().items(joi.string()).optional(),
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
