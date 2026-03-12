import jwt, { decode } from 'jsonwebtoken'
import { roleEnum, userModel } from "../../DB/models/user.model.js"
import * as DBService from "../../DB/db.service.js"
import { nanoid } from 'nanoid'
import { tokenModel } from '../../DB/models/token.model.js'


export const signatureLevelEnum = { bearer: "Bearer", system: "System" }
export const tokenTypeEnum = { access: "access", refresh: "refresh" }
export const logoutEnum = { signoutFromAll: "signoutFromAll", signout: "signout", satyLoggedIn :"satyLoggedIn" }


export const generateToken = async ({
    payload = {},
    secret = process.env.ACCESS_USER_TOKEN_SIGNATURE,
    options = {
        expiresIn: Number(process.env.ACCESS_TOKEN_EXPIRES_IN) // cast to num because this become as string
    }
} = {}) => {
    return jwt.sign(payload,secret,options)
}



export const verifyToken = async ({
    token = "",
    secret = process.env.ACCESS_USER_TOKEN_SIGNATURE,
} = {}) => {
    return jwt.verify(token, secret)
}


export const getSignatures = async ({ signatureLevel = signatureLevelEnum.bearer } = {}) => {
    
    // تعريف كائن الإرجاع الأولي
    let signatures = { accessSignature: undefined, refreshSignature: undefined };

    // التحقق من مستوى التوقيع
    switch (signatureLevel) {
        
        case signatureLevelEnum.system:
            // جلب مفاتيح توقيع النظام (System)
            signatures.accessSignature = process.env.ACCESS_SYSTEM_TOKEN_SIGNATURE;
            signatures.refreshSignature = process.env.REFRESH_SYSTEM_TOKEN_SIGNATURE;
            break;

        default:
            // في حالة القيمة الافتراضية (bearer) أو أي قيمة أخرى غير النظام
            // جلب مفاتيح توقيع المستخدم (User)
            signatures.accessSignature = process.env.ACCESS_USER_TOKEN_SIGNATURE;
            signatures.refreshSignature = process.env.REFRESH_USER_TOKEN_SIGNATURE;
            break;
    }

    return signatures;
};

export const decodedToken = async ({
  next,
  authorization = "",
  tokenType = tokenTypeEnum.access,
} = {}) => {

  const [bearer, token] = authorization.split(" ");

  if (!bearer || !token) {
    return next(new Error("missing token parts", { cause: 401 }));
  }

  let signatureLevel = signatureLevelEnum.bearer;

  if (bearer.toLowerCase() === "system") {
    signatureLevel = signatureLevelEnum.system;
  }

  const signatures = await getSignatures({ signatureLevel });

  const decoded = await verifyToken({
    token,
    secret:
      tokenType === tokenTypeEnum.access
        ? signatures.accessSignature
        : signatures.refreshSignature,
  });

  if (
    tokenType === tokenTypeEnum.refresh &&
    decoded.jti &&
    await DBService.findOne({
      model: tokenModel,
      filter: { jti: decoded.jti },
    })
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
  // 1) اختار signatures
  const signatureLevel = (user.role === roleEnum.admin) ? signatureLevelEnum.system : signatureLevelEnum.bearer;
  const signatures = await getSignatures({ signatureLevel });

  // 2) صنع jwtid
  const jwtid = nanoid();

  // 3) Access token
  const access_token = await generateToken({
    payload: { _id: user._id },
    secret: signatures.accessSignature,
    options: {
      jwtid,
      expiresIn: Number(process.env.ACCESS_TOKEN_EXPIRES_IN)
    }
  });

  // 4) Refresh token
  const refresh_token = await generateToken({
    payload: { _id: user._id },
    secret: signatures.refreshSignature,
    options: {
      jwtid,
      expiresIn: Number(process.env.REFRESH_TOKEN_EXPIRES_IN)
    }
  });

  // 5) سجّل الـ JWT ID في tokenModel (DB)
  const expiresAt = new Date(Date.now() + Number(process.env.REFRESH_TOKEN_EXPIRES_IN) * 1000);
  await DBService.create({
    model: tokenModel,
    data: [{ jti: jwtid, user: user._id, type: tokenTypeEnum.refresh, expiresAt }]
  });

  return { access_token, refresh_token, jti: jwtid };
};







