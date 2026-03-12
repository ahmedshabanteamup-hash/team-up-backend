import Joi from "joi";

export const rateClientSchema = {
  body: Joi.object({
    projectId: Joi.string().hex().length(24).required(),

    clientId: Joi.string().hex().length(24).required(),

    ratings: Joi.object({
      communication: Joi.number().min(1).max(5).required(),
      payments: Joi.number().min(1).max(5).required(),
      clarity: Joi.number().min(1).max(5).required(),
      professionalism: Joi.number().min(1).max(5).required(),
    }).required(),
  }),
};
