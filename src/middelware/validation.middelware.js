import { Types } from "mongoose";
import { asyncHandeler } from "../utils/response.js"
import joi from 'joi'

export const generalFields = {
    fullName: joi.string().min(2).max(20).messages({
        "string.min": "min name length is 2 char","any.required": "fullName is mandatory",
    }),
    email: joi.string().email({ minDomainSegments: 2, maxDomainSegments: 3, tlds: { allow: ['net', 'com', 'edu'] } }),
    password: joi.string().pattern(new RegExp(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/)),
    confirmPassword: joi.string().valid(joi.ref('password')),
    phone: joi.string().pattern(new RegExp(/^(\+02|0020)?01[0125]\d{8}$/)),
    otp: joi.string().pattern(new RegExp(/^\d{6}$/)),
    id: joi.string().hex().custom((value, helper) => {
            return Types.ObjectId.isValid(value) || helper.message("in_valid object Id Schema ")
    })    
}

export const validation = (schema) => {
    return asyncHandeler(async (req, res, next) => {
        
        
        const validationError = [];

        for (const key of Object.keys(schema)) {
          
            const validationResult = schema[key].validate(req[key]);

            if (validationResult.error) {
                validationError.push({
                    key, details: validationResult.error.details.map(ele => {
                    return {message : ele.message , path : ele.path[0]}
                })});
            }
            
        }
        
        if (validationError.length) {
            return res.status(400).json({ error_message: "Validation error", validationError });
        }

        return next();
    });
};


