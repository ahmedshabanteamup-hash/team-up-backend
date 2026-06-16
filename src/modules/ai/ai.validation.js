import joi from "joi";
import { generalFields } from "../../middelware/validation.middelware.js";

export const recommendTeamSchema = {
  body: joi
    .object({
      projectTitle: joi.string().min(2).max(120).optional(),
      team_size: joi.number().integer().min(1).max(20).optional(),
      teamSize: joi.number().integer().min(1).max(20).optional(),
      skills: joi.array().items(joi.string().min(1)).min(1).required(),
      budget: joi.number().min(1).required(),
      priority: joi
        .string()
        .valid("best quality", "lowest cost", "balanced", "fast delivery")
        .optional(),
      onlyAvailable: joi.boolean().optional(),
    })
    .required(),
};

export const recommendFromJobSchema = {
  params: joi
    .object({
      jobId: generalFields.id.required(),
    })
    .required(),
  body: joi
    .object({
      team_size: joi.number().integer().min(1).max(20).optional(),
      teamSize: joi.number().integer().min(1).max(20).optional(),
      priority: joi
        .string()
        .valid("best quality", "lowest cost", "balanced", "fast delivery")
        .optional(),
      onlyAvailable: joi.boolean().optional(),
    })
    .required(),
};

export const sessionIdParamSchema = {
  params: joi
    .object({
      sessionId: generalFields.id.required(),
    })
    .required(),
};

export const sessionPageQuerySchema = {
  params: joi
    .object({
      sessionId: generalFields.id.required(),
    })
    .required(),
  query: joi
    .object({
      search: joi.string().allow("").max(100).optional(),
    })
    .required(),
};

export const sessionMemberParamSchema = {
  params: joi
    .object({
      sessionId: generalFields.id.required(),
      developerId: generalFields.id.required(),
    })
    .required(),
};

export const replaceSuggestedMemberSchema = {
  params: joi
    .object({
      sessionId: generalFields.id.required(),
      developerId: generalFields.id.required(),
    })
    .required(),
  body: joi
    .object({
      preferredSkill: joi.string().allow("").optional(),
    })
    .required(),
};

export const candidatesQuerySchema = {
  query: joi
    .object({
      skill: joi.string().min(1).optional(),
      availableOnly: joi.boolean().optional(),
      limit: joi.number().integer().min(1).max(200).optional(),
    })
    .required(),
};
