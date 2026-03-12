import joi from "joi";
import { generalFields } from "../../middelware/validation.middelware.js";
import { roleEnum } from "../../DB/models/user.model.js";

export const sendForgotPassword = {
  body: joi.object().keys({
    email: generalFields.email.required(),
  }),
};

export const signup = {
  body: joi
    .object()
    .keys({
      role: joi.string().valid(...Object.values(roleEnum)).optional().default(roleEnum.client),
      
      email: joi.string().pattern(/^[a-zA-Z0-9._%+-]+@gmail\.(com|net|edu|org)$/).required(),

      password: joi.string().pattern( new RegExp(
            /^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()_+\-\[\]{}|;":'<>,.?/\\])[a-zA-Z0-9!@#$%^&*()_+\-\[\]{}|;":'<>,.?/\\]{8,}$/
          )
        ).required(),

        skills: joi.array().items(joi.string()).optional(),

      // admin ملوش confirmPassword
      confirmPassword: joi.when("role", {
        is: roleEnum.admin,
        then: joi.forbidden(),
        otherwise: generalFields.confirmPassword.messages({
            "any.only": "Password and confirm do not match",
            "any.required": "Confirm password is required",
          }).required(),
      }),

      // 3) fullName مطلوب للـ client & developer بس
      fullName: joi.when("role", {
        is: joi.valid(roleEnum.client, roleEnum.developer),
        then: generalFields.fullName.required(),
        otherwise: joi.forbidden(),
      }),

      // 4) skills مطلوبة للديفيلوبر بس
      skills: joi.when("role", {
        is: roleEnum.developer,
        then: joi.array().items(joi.string()).min(1).required(),
        otherwise: joi.forbidden(),
      }),

      // 5) servicesWanted للـ client (اختيارى)
      servicesWanted: joi.when("role", {
        is: roleEnum.client,
        then: joi.array().items(joi.string()).min(1).optional(),
        otherwise: joi.forbidden(),
      }),

      // 6) company fields للـ company بس
      companyName: joi.when("role", {
        is: roleEnum.company,
        then: joi.string().min(2).max(50).required(),
        otherwise: joi.forbidden(),
      }),

      companySize: joi.when("role", {
        is: roleEnum.company,
        then: joi.string().required(),
        otherwise: joi.forbidden(),
      }),

      industry: joi.when("role", {
        is: roleEnum.company,
        then: joi.string().allow("").optional(),
        otherwise: joi.forbidden(),
      }),

      // 7) adminCode للـ admin بس
      adminCode: joi.when("role", {
        is: roleEnum.admin,
        then: joi.string().required(),
        otherwise: joi.forbidden(),
      }),
    }).required(),
};


export const login = {
  body: joi
    .object()
    .keys({
      email: generalFields.email.required(),
      password: joi.string().required()
    })
    .required()
    .options({ allowUnknown: false }),
};


export const confirmEmail = {
  body: joi
    .object()
    .keys({
      email: generalFields.email.required(),
      otp: generalFields.otp.required(),
    })
    .required()
    .options({ allowUnknown: false }),
};

export const loginWithGmail = {
  body: joi
    .object()
    .keys({
      idToken: joi.string().required(),
    })
    .required()
    .options({ allowUnknown: false }),
};
// انه مش هيتكرر حطناه هنا مش قى الجينرال فييلد
