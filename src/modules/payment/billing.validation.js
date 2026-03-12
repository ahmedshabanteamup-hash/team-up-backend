// modules/billing/billing.validation.js
import Joi from "joi";

export const addPaymentMethod = {
  body: Joi.object({
    type: Joi.string()
      .valid("bank", "paypal")
      .required(),

    providerData: Joi.when("type", {
      is: "bank",
      then: Joi.object({
        bankName: Joi.string().required(),
        accountNumber: Joi.string().required(),
      }).required(),

      otherwise: Joi.object({
        email: Joi.string().email().required(),
      }).required(),
    }),
  }).required(),
};
