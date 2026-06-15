import jwt from "jsonwebtoken";
import { nanoid } from "nanoid";
import { roleEnum, userModel } from "../../DB/models/user.model.js";
import { tokenModel } from "../../DB/models/token.model.js";
import * as DBService from "../../DB/db.service.js";

export const signatureLevelEnum = { bearer: "Bearer", system: "System" };
export const tokenTypeEnum = { access: "access", refresh: "refresh" };
export const logoutEnum = {
  signoutFromAll: "signoutFromAll",
  signout: "signout",
  satyLoggedIn: "satyLoggedIn",
};

const THIRTY_DAYS_IN_SECONDS = 30 * 24 * 60 * 60;

export const getTokenExpirySeconds = (envKey) => {
  const value = Number(process.env[envKey]);
  return Number.isFinite(value) && value > 0 ? value : THIRTY_DAYS_IN_SECONDS;
};

export const generateToken = async ({
  payload = {},
  secret = process.env.ACCESS_USER_TOKEN_SIGNATURE,
  options = {
    expiresIn: getTokenExpirySeconds("ACCESS_TOKEN_EXPIRES_IN"),
  },
} = {}) => jwt.sign(payload, secret, options);

export const verifyToken = async ({
  token = "",
  secret = process.env.ACCESS_USER_TOKEN_SIGNATURE,
} = {}) => jwt.verify(token, secret);

export const getSignatures = async ({
  signatureLevel = signatureLevelEnum.bearer,
} = {}) => {
  if (signatureLevel === signatureLevelEnum.system) {
    return {
      accessSignature: process.env.ACCESS_SYSTEM_TOKEN_SIGNATURE,
      refreshSignature: process.env.REFRESH_SYSTEM_TOKEN_SIGNATURE,
    };
  }

  return {
    accessSignature: process.env.ACCESS_USER_TOKEN_SIGNATURE,
    refreshSignature: process.env.REFRESH_USER_TOKEN_SIGNATURE,
  };
};

const extractTokenParts = (authorization = "") => {
  const value = String(authorization || "").trim();

  if (!value) return null;

  const parts = value.split(" ").filter(Boolean);

  if (parts.length === 1) {
    return { signatureLevel: signatureLevelEnum.bearer, token: parts[0] };
  }

  const scheme = parts[0].toLowerCase();
  const token = parts.slice(1).join(" ").trim();

  if (scheme === "bearer") {
    return { signatureLevel: signatureLevelEnum.bearer, token };
  }

  if (scheme === "system") {
    return { signatureLevel: signatureLevelEnum.system, token };
  }

  return null;
};

export const decodedToken = async ({
  next,
  authorization = "",
  tokenType = tokenTypeEnum.access,
} = {}) => {
  const parsed = extractTokenParts(authorization);

  if (!parsed?.token) {
    return next(
      new Error(
        "missing/invalid authorization header. use: Bearer <access_token>",
        { cause: 401 }
      )
    );
  }

  const signatures = await getSignatures({
    signatureLevel: parsed.signatureLevel,
  });

  let decoded;
  try {
    decoded = await verifyToken({
      token: parsed.token,
      secret:
        tokenType === tokenTypeEnum.access
          ? signatures.accessSignature
          : signatures.refreshSignature,
    });
  } catch (error) {
    if (
      error?.name === "JsonWebTokenError" &&
      error?.message?.includes("invalid signature")
    ) {
      return next(
        new Error(
          "invalid token signature. make sure you send credentials.access_token from /auth/login",
          { cause: 401 }
        )
      );
    }

    if (error?.name === "TokenExpiredError") {
      return next(new Error("token expired, please login again", { cause: 401 }));
    }

    return next(new Error("invalid token", { cause: 401 }));
  }

  if (
    tokenType === tokenTypeEnum.refresh &&
    decoded.jti &&
    (await DBService.findOne({
      model: tokenModel,
      filter: { jti: decoded.jti },
    }))
  ) {
    return next(new Error("invalid login credentials", { cause: 401 }));
  }

  const user = await DBService.findById({
    model: userModel,
    id: decoded._id,
  });

  if (!user) {
    return next(new Error("Not Register account", { cause: 404 }));
  }

  if (user.changeCredentialsTime?.getTime() > decoded.iat * 1000) {
    return next(new Error("invalid login credentials", { cause: 401 }));
  }

  return { user, decoded };
};

export const generateLoginCredentials = async ({ user = {} } = {}) => {
  const signatureLevel =
    user.role === roleEnum.admin
      ? signatureLevelEnum.system
      : signatureLevelEnum.bearer;
  const signatures = await getSignatures({ signatureLevel });

  const jwtid = nanoid();

  const access_token = await generateToken({
    payload: { _id: user._id },
    secret: signatures.accessSignature,
    options: {
      jwtid,
      expiresIn: getTokenExpirySeconds("ACCESS_TOKEN_EXPIRES_IN"),
    },
  });

  const refresh_token = await generateToken({
    payload: { _id: user._id },
    secret: signatures.refreshSignature,
    options: {
      jwtid,
      expiresIn: getTokenExpirySeconds("REFRESH_TOKEN_EXPIRES_IN"),
    },
  });

  const expiresAt = new Date(
    Date.now() + getTokenExpirySeconds("REFRESH_TOKEN_EXPIRES_IN") * 1000
  );
  await DBService.create({
    model: tokenModel,
    data: [{ jti: jwtid, user: user._id, type: tokenTypeEnum.refresh, expiresAt }],
  });

  return {
    access_token,
    refresh_token,
    accessToken: access_token,
    refreshToken: refresh_token,
    tokenType: "Bearer",
    jti: jwtid,
  };
};
