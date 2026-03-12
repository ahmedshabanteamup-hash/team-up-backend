import joi  from "joi"
import { generalFields } from "../../middelware/validation.middelware.js";
import { logoutEnum } from "../../utils/security/token.security.js";

export const logout = {

    body : joi.object().keys({
      flag : joi.string().valid(...Object.values(logoutEnum)).default(logoutEnum.satyLoggedIn)
    }).required()
  
}
export const shareProfile = {

    params: joi.object().keys({
      userId : generalFields.id.required()
    })
}
    
export const updateBasicInfo = {

    body: joi.object().keys({
        fullName: generalFields.fullName,
        phone: generalFields.phone,
    }).required()
}
export const updatePassword = {

    body: joi.object().keys({
        oldPassword: generalFields.password.required(),
        password: generalFields.password.not(joi.ref('oldPassword')).required(),
        confirmPassword : generalFields.confirmPassword
    }).required()
}



export const freezeAccount = {
    
    params: joi.object().keys({
      userId : generalFields.id
    })
}
    
export const restoreAccount = {

    params: joi.object().keys({
      userId : generalFields.id.required()
    })
}
    
export const deleteAccount = {

    params: joi.object().keys({
      userId : generalFields.id.required()
    })
}
    


