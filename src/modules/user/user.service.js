import { roleEnum, userModel } from "../../DB/models/user.model.js";
import { asyncHandeler, successResponse } from "../../utils/response.js";
import {
  generateDecryption,
  generateEncryption,
} from "../../utils/security/encryption.js";
import {
  generateLoginCredentials,
  generateToken,
  getSignatures,
  logoutEnum,
  signatureLevelEnum,
} from "../../utils/security/token.security.js";
import * as dbService from "../../DB/db.service.js";
import {
  compareHash,
  generateHash,
} from "../../utils/security/hash.security.js";
import { tokenModel } from "../../DB/models/token.model.js";


export const profile = asyncHandeler(async (req, res, next) => {
  req.user.phone = await generateDecryption({ cipherText: req.user.phone });
  return successResponse({
    res,
    message: "user finded correctly",
    data: { user: req.user },
  });
});

export const logout = asyncHandeler(async (req, res, next) => {
  const { flag } = req.body;
  let status = 200;

  switch (flag) {

    case logoutEnum.signoutFromAll:
      await dbService.updateOne({
        model: userModel,
        filter: { _id: req.decoded._id },
        data: {
          changeCredentialsTime: new Date(),
        },
      });

      break;
    default:
      await dbService.create({
        model: tokenModel,
        data: [
          {
            jti: req.decoded.jti,
            expiresIn:
              req.decoded.iat + Number(process.env.REFRESH_TOKEN_EXPIRES_IN),
            userId: req.decoded._id,
          },
        ],
      });
      status = 201;
      break;
  }

  return successResponse({ res, status, data: {} });
});

export const shareProfile = asyncHandeler(async (req, res, next) => {
  const { userId } = req.params;
  const user = await dbService.findOne({
    model: userModel,
    filter: {
      _id: userId,
      confirmEmail: { $exists: true },
    },
  });
  return user
    ? successResponse({ res, data: { user } })
    : next(new Error("in_valid Account "));
});

export const updatePassword = asyncHandeler(async (req, res, next) => {
  const { oldPassword, password } = req.body;
  const matchedPassword = await compareHash({
    plaintext: oldPassword,
    hashValue: req.user.password,
  });
  if (matchedPassword) {
    return next(new Error("in valid old password"));
  }
  const user = await dbService.findOneAndUpdate({
    model: userModel,
    filter: {
      _id: req.user._id,
    },
    data: {
      password: await generateHash({ plaintext: password }),
    },
  });
  return user
    ? successResponse({ res, data: { user } })
    : next(new Error("in_valid Account ", { cause: 404 }));
});

////////////////////////////// delete acc soft admin can and user can any no

export const deleteAccount = asyncHandeler(async (req, res, next) => {
  const { userId } = req.params;

  // target user
  const targetUserId = userId || req.user._id;

  const isAdmin = req.user.role === roleEnum.admin;
  const isSelf = String(req.user._id) === String(targetUserId);

  // permission check
  if (!isAdmin && !isSelf) {
    return next(new Error("not authorized", { cause: 403 }));
  }

  const user = await dbService.findOneAndUpdate({
    model: userModel,
    filter: {
      _id: targetUserId,
      deletedAt: { $exists: false },
    },
    data: {
      deletedAt: new Date(),
      deletedBy: req.user._id,
    },
  });

  if (!user) {
    return next(new Error("invalid account", { cause: 404 }));
  }

  return successResponse({
    res,
    message: "account deleted successfully",
  });
});
/////////////////////////////end delete acc soft acc




export const profileImage = asyncHandeler(async (req, res, next) => {
  return  successResponse({ res, data: { file : req.file} })
});

export const updateBasicInfo = asyncHandeler(async (req, res, next) => {
  if (req.user.phone) {
    req.body.phone = await generateEncryption({ plainText: req.body.phone });
  }
  const user = await dbService.findOneAndUpdate({
    model: userModel,
    filter: {
      _id: req.user._id,
    },
    data: req.body,
  });
  return user
    ? successResponse({ res, data: { user } })
    : next(new Error("in_valid Account ", { cause: 404 }));
});


export const freezeAccount = asyncHandeler(async (req, res, next) => {
  const { userId } = req.params;

  const targetUserId = userId || req.user._id;

  const isAdmin = req.user.role === roleEnum.admin;
  const isSelf = !userId || userId === String(req.user._id);

  if (!isAdmin && !isSelf) {
    return next(new Error("not authorized", { cause: 403 }));
  }

  const user = await dbService.findOneAndUpdate({
    model: userModel,
    filter: {
      _id: targetUserId,
      deletedAt: { $exists: false },
    },
    data: {
      deletedAt: new Date(),
      deletedBy: req.user._id,
      changeCredentialsTime: new Date(),
    },
  });

  if (!user) {
    return next(new Error("invalid account", { cause: 404 }));
  }

  return successResponse({
    res,
    message: "account frozen successfully",
    data: { user },
  });
});


// export const deleteAccount = asyncHandeler(async (req, res, next) => {
//   const { userId } = req.params;

//   const user = await dbService.deleteOne({
//     model: userModel,
//     filter: {
//       _id: userId,
//       deletedAt: { $exists: true },
//     },
//   });

//   return user.deletedCount
//     ? successResponse({ res, data: { user } })
//     : next(new Error("in_valid Account ", { cause: 404 }));
// });

export const restoreAccount = asyncHandeler(async (req, res, next) => {
  const { userId } = req.params; // id account that re store by admin

  if (userId && req.user.role !== roleEnum.admin) {
    return next(
      new Error(" invalid or not authourized account ", { cause: 403 })
    );
  }

  const user = await dbService.findOneAndUpdate({
    model: userModel,
    filter: {
      _id: userId,
      deletedAt: { $exists: true }, // true because cannot restore exists account must be deleted
      deletedBy: { $ne: userId }, // restored only by admin
    },
    data: {
      $unset: {
        // delete not need in db
        deletedAt: 1,
        deletedBy: 1,
      },
      restoredAt: Date.now(),
      restoredBy: req.user._id,
    },
  });

  return user
    ? successResponse({ res, data: { user } })
    : next(new Error("in_valid Account ", { cause: 404 }));
});

export const getNewLoginCredentials = asyncHandeler(async (req, res, next) => {
  const credentials = await generateLoginCredentials({ user: req.user });
  return successResponse({ res, data: { credentials } });
});
