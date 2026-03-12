import  { asyncHandeler } from "../utils/response.js";
import { decodedToken, tokenTypeEnum } from "../utils/security/token.security.js";

// export const authentication = ({ tokenType = tokenTypeEnum.access } = {}) => {
//   return asyncHandeler(async (req, res, next) => {

//     const { user, decoded } = await decodedToken({next,authorization: req.headers.authorization, tokenType })|| {};
//     req.user = user;
//     req.decoded = decoded;

//    return next();
//   });
// };

export const authentication = ({ tokenType = tokenTypeEnum.access } = {}) => {
  return asyncHandeler(async (req, res, next) => {

    const { user, decoded } = await decodedToken({next,authorization: req.headers.authorization, tokenType })|| {};

    // لو decoded يحتوي id لكن user غير موجود، جيبي الـ user من DB علشان يكون عندنا role
    if (!user && decoded && decoded.id) {
      req.user = await dbService.findOne({ model: userModel, filter: { _id: decoded.id } });
    } else {
      req.user = user;
    }

    req.decoded = decoded;

   return next();
  });
};



export const authourization = ({ tokenType = tokenTypeEnum.access } = {}) => {
    return asyncHandeler(
        async (req, res, next) => {
            req.user = await decodedToken({ next, authorization: req.headers.authorization, tokenType });
            return next();
        }
    )
}



export const auth = ({ tokenType = tokenTypeEnum.access, accessRoles = [] } = {}) => {
  return asyncHandeler(
    async (req, res, next) => {
  const { user, decoded } = await decodedToken({ next, authorization: req.headers.authorization, tokenType }) || {};
        // كنّا نعيّن req.user قبل؛ نتحقق ونكمل بنفس الأسلوب
        if (!user && decoded && decoded.id) {
          req.user = await dbService.findOne({ model: userModel, filter: { _id: decoded.id } });
        } else {
          req.user = user;
        }

        req.decoded = decoded;

        // guard لو مفيش user
        if (!req.user) return next(new Error("not authenticated", { cause: 401 }));

        console.log({ accessRoles, currentRole: req.user.role, match: accessRoles.includes(req.user.role) });
      if (!accessRoles.includes(req.user.role)) {
        return next(new Error("Not authorized account", { cause: 403 }))
      }
      return next()
    }
  )
}