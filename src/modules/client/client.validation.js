import joi from "joi";
import { generalFields } from "../../middelware/validation.middelware.js";

export const createClientProfile = {
  body: joi.object({
    fullName: generalFields.fullName.required(),
    bio: joi.string().max(500).optional(),
    country: joi.string().optional(),
    phone: generalFields.phone.optional(),
    servicesWanted: joi.array().items(joi.string()).optional(),
    skills: joi.array().items(joi.string()).optional(),
  }).required(),
};
///////////////////////////////////////////////////////////
export const updateClientProfile = {
  body: joi.object({
    fullName: joi.string().allow("").max(100).optional(),
    userName: joi.string().allow("").min(3).optional(),
    phone: joi.string().allow("").max(30).optional(),
    country: joi.string().allow("").optional(),
    bio: joi.string().allow("").optional(),
    servicesWanted: joi.array().items(joi.string()).optional(),
    skills: joi.array().items(joi.string()).optional(),
  }).unknown(true).required(),
};
