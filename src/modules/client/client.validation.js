import joi from "joi";
import { generalFields } from "../../utils/general-fields.js";

export const createClientProfile = {
  body: joi.object({
    fullName: generalFields.fullName.required(),
    bio: joi.string().max(500).optional(),
    country: joi.string().optional(),
    phone: generalFields.phone.optional(),
  }).required(),
};
///////////////////////////////////////////////////////////
export const updateClientProfile = {
  body: joi.object({
    fullName: generalFields.fullName.optional(),
    userName: joi.string().min(3).optional(),
    phone: generalFields.phone.optional(),
    country: joi.string().optional(),
    bio: joi.string().allow("").optional(),
    servicesWanted: joi.array().items(joi.string()).optional(),
  }).required(),
};
