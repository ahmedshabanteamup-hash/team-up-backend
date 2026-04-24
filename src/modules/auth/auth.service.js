import { roleEnum, userModel } from "../../DB/models/user.model.js";
import { asyncHandeler, successResponse } from "../../utils/response.js";
import * as dbService from "../../DB/db.service.js";
import { compareHash, generateHash } from "../../utils/security/hash.security.js";
import { OAuth2Client } from "google-auth-library";
import { generateLoginCredentials } from "../../utils/security/token.security.js";
import { companyModel } from "../../DB/models/company.model.js";
import { clientModel } from "../../DB/models/client.model.js";
import { developerModel } from "../../DB/models/developer.model.js";

const ensureProfileForRole = async ({
  role,
  userId,
  fullName = "",
  servicesWanted = [],
  skills = [],
  companyName = "",
  companySize = "",
  industry = "",
}) => {
  if (role === roleEnum.developer) {
    const existing = await dbService.findOne({
      model: developerModel,
      filter: { user: userId },
    });

    if (!existing) {
      await dbService.create({
        model: developerModel,
        data: [{ user: userId, fullName, skills: skills || [] }],
      });
    }
  }

  if (role === roleEnum.client) {
    const existing = await dbService.findOne({
      model: clientModel,
      filter: { user: userId },
    });

    if (!existing) {
      await dbService.create({
        model: clientModel,
        data: [{ user: userId, fullName, servicesWanted: servicesWanted || [] }],
      });
    }
  }

  if (role === roleEnum.company) {
    const existing = await dbService.findOne({
      model: companyModel,
      filter: { user: userId },
    });

    if (!existing) {
      await dbService.create({
        model: companyModel,
        data: [{ user: userId, companyName, companySize, industry }],
      });
    }
  }
};

const verifyGoogleAccount = async ({ idToken }) => {
  const client = new OAuth2Client();
  const ticket = await client.verifyIdToken({
    idToken,
    audience: process.env.WEB_CLIENT_ID,
  });

  return ticket.getPayload();
};

export const signup = asyncHandeler(async (req, res, next) => {
  const {
    role,
    email,
    password,
    fullName,
    servicesWanted,
    skills,
    companyName,
    companySize,
    industry,
    adminCode,
  } = req.body;

  if (role === roleEnum.admin && adminCode !== process.env.ADMIN_SIGNUP_SECRET) {
    return next(new Error("invalid admin code", { cause: 403 }));
  }

  const existingUser = await dbService.findOne({
    model: userModel,
    filter: { email },
  });

  if (existingUser) {
    return next(new Error("email exist", { cause: 409 }));
  }

  const hashPass = await generateHash({ plaintext: password, saltRound: 12 });
  const allowedRoles = [
    roleEnum.client,
    roleEnum.developer,
    roleEnum.company,
    roleEnum.admin,
  ];
  const safeRole = allowedRoles.includes(role) ? role : roleEnum.client;

  const [newUser] = await dbService.create({
    model: userModel,
    data: [{ email, password: hashPass, role: safeRole }],
  });

  await ensureProfileForRole({
    role: safeRole,
    userId: newUser._id,
    fullName,
    servicesWanted,
    skills,
    companyName,
    companySize,
    industry,
  });

  return successResponse({
    res,
    status: 201,
    message: "User Created Successfully",
    data: {
      user: {
        _id: newUser._id,
        email: newUser.email,
        role: newUser.role,
      },
    },
  });
});

export const login = asyncHandeler(async (req, res, next) => {
  const { email, password } = req.body;
  const user = await dbService.findOne({ model: userModel, filter: { email } });

  if (!user) {
    return next(new Error("invalid login email", { cause: 404 }));
  }

  const matchedPassword = await compareHash({
    plaintext: password,
    hashValue: user.password,
  });

  if (!matchedPassword) {
    return next(new Error("invalid login password", { cause: 400 }));
  }

  const credentials = await generateLoginCredentials({ user });
  return successResponse({ res, status: 201, data: { credentials } });
});

export const sendForgotPassword = asyncHandeler(async (req, res, next) => {
  const { email } = req.body;

  const user = await dbService.findOne({
    model: userModel,
    filter: { email },
  });

  if (!user) {
    return next(new Error("invailid account", { cause: 404 }));
  }

  // Email delivery step intentionally skipped for now (no reset flow endpoint yet).
  return successResponse({
    res,
    message: "reset process initialized successfully",
  });
});

export const signupWithGmail = asyncHandeler(async (req, res, next) => {
  const { idToken } = req.body;
  const payload = await verifyGoogleAccount({ idToken });
  const email = payload?.email;
  const name = payload?.name || "Google User";
  const emailVerified = payload?.email_verified;

  if (!email || !emailVerified) {
    return next(new Error("not verified account", { cause: 400 }));
  }

  let user = await dbService.findOne({
    model: userModel,
    filter: { email },
  });

  if (!user) {
    const generatedPassword = await generateHash({
      plaintext: `${Date.now()}-${email}`,
      saltRound: 12,
    });

    const [newUser] = await dbService.create({
      model: userModel,
      data: [
        {
          email,
          password: generatedPassword,
          role: roleEnum.client,
          confirmEmail: true,
        },
      ],
    });
    user = newUser;

    await ensureProfileForRole({
      role: roleEnum.client,
      userId: user._id,
      fullName: name,
      servicesWanted: [],
    });
  }

  const credentials = await generateLoginCredentials({ user });

  return successResponse({
    res,
    status: 201,
    message: "done signupWithGmail",
    data: { credentials },
  });
});

export const loginWithGmail = asyncHandeler(async (req, res, next) => {
  const { idToken } = req.body;
  const payload = await verifyGoogleAccount({ idToken });
  const email = payload?.email;
  const name = payload?.name || "Google User";
  const emailVerified = payload?.email_verified;

  if (!email || !emailVerified) {
    return next(new Error("not verified account", { cause: 400 }));
  }

  let user = await dbService.findOne({
    model: userModel,
    filter: { email },
  });

  if (!user) {
    const generatedPassword = await generateHash({
      plaintext: `${Date.now()}-${email}`,
      saltRound: 12,
    });

    const [newUser] = await dbService.create({
      model: userModel,
      data: [
        {
          email,
          password: generatedPassword,
          role: roleEnum.client,
          confirmEmail: true,
        },
      ],
    });
    user = newUser;

    await ensureProfileForRole({
      role: roleEnum.client,
      userId: user._id,
      fullName: name,
      servicesWanted: [],
    });
  }

  const credentials = await generateLoginCredentials({ user });

  return successResponse({
    res,
    status: 201,
    message: "done loginWithGmail",
    data: { credentials },
  });
});

