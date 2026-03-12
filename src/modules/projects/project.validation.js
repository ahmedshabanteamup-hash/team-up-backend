import Joi from "joi";

export const createProject = {
  body: Joi.object({
    title: Joi.string().min(3).max(100).required(),
    description: Joi.string().allow("").optional(),
    teamSize: Joi.number().min(0).optional(),
  }),
};
