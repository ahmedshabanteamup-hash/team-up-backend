import { roleEnum, userModel } from "../../DB/models/user.model.js";
import { asyncHandeler, successResponse } from "../../utils/response.js";
import * as dbService from "../../DB/db.service.js";
import {compareHash, generateHash,} from "../../utils/security/hash.security.js";
import { OAuth2Client } from "google-auth-library";
import { generateLoginCredentials } from "../../utils/security/token.security.js";
import { customAlphabet } from "nanoid";
import { companyModel } from "../../DB/models/company.model.js";
import { clientModel } from "../../DB/models/client.model.js";
import { developerModel } from "../../DB/models/developer.model.js";



export const signup = asyncHandeler(async (req, res, next) => {

  const { role, email, password, confirmPassword, fullName, servicesWanted, skills, companyName, companySize, industry, adminCode } = req.body;
  
  const hashPass = await generateHash({ plaintext: password, saltRound: 12 });

   if (role === roleEnum.admin) {
    if (!adminCode || adminCode !== process.env.ADMIN_SIGNUP_SECRET) {
      return next(new Error("invalid admin code", { cause: 403 }));
    }
  }

    const existingUser = await dbService.findOne({
    model: userModel,
    filter: { email }
    });
  
  if (existingUser) {
    return next(new Error("email exist", { cause: 409 }));
  }
 const allowedRoles = [
    roleEnum.client,
    roleEnum.developer,
    roleEnum.company,
    roleEnum.admin
  ];

  const safeRole = allowedRoles.includes(role) ? role : roleEnum.client;   // if not any of them put it client 

const [newUser] = await dbService.create({
    model: userModel,
    data: [{
      email,
      password: hashPass,
      role: safeRole
    }]
  });
// ---- Developer Profile ----
  if (safeRole === roleEnum.developer) {
    await dbService.create({
      model: developerModel,
      data: [{
        user: newUser._id,
        fullName,
        skills: skills || []
      }]
    });
  }

  // ---- Client Profile ----
  if (safeRole === roleEnum.client) {
    await dbService.create({
      model: clientModel,
      data: [{
        user: newUser._id,
        fullName,
        servicesWanted: servicesWanted || []
      }]
    });
  }

  // ---- Company Profile ----
  if (safeRole === roleEnum.company) {
    await dbService.create({
      model: companyModel,
      data: [{
        user: newUser._id,
        companyName,
        companySize,
        industry
      }]
    });
  }

  // ---- Admin DOES NOT HAVE PROFILE ----
  // only user entry is enough.
  // ======================
  //  7) RESPONSE
  // ======================
return successResponse({
  res,
  status: 201,
  message: "User Created Successfully",
  data: {
    user: {
      _id: newUser._id,
      email: newUser.email,
      role: newUser.role
    }
  }
});


});


export const sendForgotPassword = asyncHandeler(async (req, res, next) => {
  const { email } = req.body
  const otp =  customAlphabet("0123456789",6)()
  const user = await dbService.findOneAndUpdate({
    model: userModel,
    filter: {
      email,
      provider: providerEnum.system,
      deldetedAt:{$exists:false},
      confirmEmail:{$exists:true}
    },
    data: {
    ForgotPasswordOtp:await generateHash({plaintext: otp}),
    }
  })

  if (!user) {
    return next(new Error ("invailid account",{cause : 404}))
  }
 emailEvenet.emit("sendForgotPassword",{to:email,subject:"forgot password",title:"reset password",otp})
   return successResponse({ res }) 
});


async function verifyGoogleAccount({ idToken }) {
  const client = new OAuth2Client();
  const ticket = await client.verifyIdToken({
    idToken,
    audience: process.env.WEB_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  return payload;
}


export const signupWithGmail = asyncHandeler(async (req, res, next) => {
  const { idToken } = req.body;
  const { name, email, email_verified, picture } = await verifyGoogleAccount({
    idToken,
  });

  if (!email_verified) {
    return next(new Error(" not verified account"));
  }
  const user = await dbService.findOne({
    model: userModel,
    filter: { email },
  });

  if (user.provider === providerEnum.google) {
    const credentials = await generateLoginCredentials({user})
    return successResponse({
    res,
    status: 201,
    message: "done signupWithGmail",
    data: {credentials}
  });
  }
  const [newUser] = await dbService.create({
    model: userModel,
    data: [ {
        fullName: name,
        email,
        confirmEmail: Date.now(),
        picture,
        provider:providerEnum.google
      }]
    
  });

  return successResponse({
    res,
    status: 201,
    message: "done signupWithGmail",
    data: {user: newUser._id }
  });
});


export const loginWithGmail = asyncHandeler(async (req, res, next) => {
  const { idToken } = req.body;
  const { email, email_verified } = await verifyGoogleAccount({
    idToken
  });

  if (!email_verified) {
    return next(new Error(" not verified account"));
  }
  const user = await dbService.findOne({
    model: userModel,
    filter: { email , provider : providerEnum.google},
  });

  if (!user) {
    return next(new Error(" In_valid login data or invalid provider"), { cause: 404 });
  }
  return successResponse({
    res,
    status: 201,
    message: "done signupWithGmail",
    data: {user: newUser._id }
  })

  });


export const login = asyncHandeler(async (req, res, next) => {
  const { email , password  } = req.body;
  const user = await dbService.findOne({ model: userModel, filter: { email } });
  if (!user) {
    return next(new Error("invalid login email", { cause: 404 }));
  }
  
 const matchedPassword = await compareHash({
        plaintext: password,
        hashValue: user.password
    });

    if (!matchedPassword) {
        return next(new Error("invalid login password", { cause: 400 }));
    }


 const credentials = await generateLoginCredentials({user})
  return successResponse({ res, status:201 , data: { credentials } })
})