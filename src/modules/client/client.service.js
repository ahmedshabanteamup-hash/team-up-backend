import { asyncHandler } from "../../utils/response.js";
import * as dbService from "../../DB/db.service.js";
import { clientModel } from "../../DB/models/client.model.js";
import { roleEnum } from "../../utils/enums.js";
import { userModel } from "../../DB/models/user.model.js";
import { successResponse } from "../../utils/response.js";

export const createClientProfile = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;
  const { fullName, bio, country, phone } = req.body;

  // 1️⃣ role check
  if (req.user.role !== roleEnum.client) {
    return next(new Error("not allowed", { cause: 403 }));
  }

  // 2️⃣ check if profile already exists
  const exists = await dbService.findOne({
    model: clientModel,
    filter: { user: userId },
  });

  if (exists) {
    return next(new Error("client profile already exists", { cause: 409 }));
  }

  // 3️⃣ create profile
  const profile = await dbService.create({
    model: clientModel,
    data: [
      {
        user: userId,
        fullName,
        bio,
        country,
        phone,
      },
    ],
  });

      return successResponse({
          res,
          status: 201,
          message: "Client profile created successfully",
          data: { profile },
  });
});

// ////////////////////////////////////////////////////////////////////////////////////22222222222   
// دا مفهوش فاليديشن دا مش جاى من البودى
export const getMyClientProfile = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;

  // 1️⃣ تأكد إن الرول Client
  if (req.user.role !== roleEnum.client) {
    return next(new Error("not allowed", { cause: 403 }));
  }

  // 2️⃣ هات اليوزر
  const user = await dbService.findOne({
    model: userModel,
    filter: { _id: userId, confirmEmail: { $exists: true } },
    select: "email createdAt",
  });

  if (!user) {
    return next(new Error("invalid account", { cause: 404 }));
  }

  // 3️⃣ هات البروفايل
  const clientProfile = await dbService.findOne({
    model: clientModel,
    filter: { user: userId },
  });

  if (!clientProfile) {
    return next(new Error("client profile not found", { cause: 404 }));
  }

  // 4️⃣ Response
  return successResponse({
    res,
    data: {
      user,
      clientProfile,
    },
  });
});

///////////////////////////////////////////////////////////////////////////////////////
export const updateClientProfile = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;
  const {
    fullName,
    userName,
    phone,
    country,
    bio,
    servicesWanted,
  } = req.body;

  // 1️⃣ role check
  if (req.user.role !== roleEnum.client) {
    return next(new Error("not allowed", { cause: 403 }));
  }

  // 2️⃣ profile exists ?
  const profile = await dbService.findOne({
    model: clientModel,
    filter: { user: userId },
  });

  if (!profile) {
    return next(new Error("client profile not found", { cause: 404 }));
  }

  // 3️⃣ update (only sent fields)
  const updatedProfile = await dbService.findOneAndUpdate({
    model: clientModel,
    filter: { user: userId },
    data: {
      ...(fullName && { fullName }),
      ...(userName && { userName }),
      ...(phone && { phone }),
      ...(country && { country }),
      ...(bio && { bio }),
      ...(servicesWanted && { servicesWanted }),
    },
  });

  // 4️⃣ response
  return successResponse({
    res,
    message: "Client profile updated successfully",
    data: { profile: updatedProfile },
  });
});

//////////////////////////////////////////

