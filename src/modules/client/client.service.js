import { asyncHandeler, successResponse } from "../../utils/response.js";
import * as dbService from "../../DB/db.service.js";
import { clientModel } from "../../DB/models/client.model.js";
import { roleEnum, userModel } from "../../DB/models/user.model.js";
import { projectModel } from "../../DB/models/project.model.js";
import { ratingModel } from "../../DB/models/rating.model.js";

const getClientRanking = (averageRating) => {
  if (averageRating >= 4.5) return "Gold";
  if (averageRating >= 4) return "Silver";
  if (averageRating >= 3) return "Bronze";
  return "Starter";
};

const buildClientAccountSummary = async (userId) => {
  const projects = await dbService.find({
    model: projectModel,
    filter: {
      client: userId,
      deletedAt: { $exists: false },
    },
    select: "teamSize",
  });

  const ratingSummary = await ratingModel.aggregate([
    { $match: { client: userId } },
    {
      $group: {
        _id: null,
        totalRatings: { $sum: 1 },
        overallRating: { $avg: "$overall" },
      },
    },
  ]);

  const totalTeamsBuilt = projects.filter((project) => (project.teamSize || 0) > 0).length;
  const averageRating = Number((ratingSummary[0]?.overallRating || 0).toFixed(1));

  return {
    totalTeamsBuilt,
    averageRating,
    ranking: getClientRanking(averageRating),
    totalRatings: ratingSummary[0]?.totalRatings || 0,
  };
};

export const createClientProfile = asyncHandeler(async (req, res, next) => {
  const userId = req.user._id;
  const {
    fullName,
    bio,
    country,
    phone,
    servicesWanted = [],
    skills = [],
  } = req.body;

  if (req.user.role !== roleEnum.client) {
    return next(new Error("not allowed", { cause: 403 }));
  }

  const exists = await dbService.findOne({
    model: clientModel,
    filter: { user: userId },
  });

  if (exists) {
    return next(new Error("client profile already exists", { cause: 409 }));
  }

  const profile = await dbService.create({
    model: clientModel,
    data: [
      {
        user: userId,
        fullName,
        bio,
        country,
        phone,
        servicesWanted,
        skills,
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

export const getMyClientProfile = asyncHandeler(async (req, res, next) => {
  const userId = req.user._id;

  if (req.user.role !== roleEnum.client) {
    return next(new Error("not allowed", { cause: 403 }));
  }

  const user = await dbService.findOne({
    model: userModel,
    filter: { _id: userId, confirmEmail: { $exists: true } },
    select: "email createdAt",
  });

  if (!user) {
    return next(new Error("invalid account", { cause: 404 }));
  }

  const clientProfile = await dbService.findOne({
    model: clientModel,
    filter: { user: userId },
  });

  if (!clientProfile) {
    return next(new Error("client profile not found", { cause: 404 }));
  }

  const accountSummary = await buildClientAccountSummary(userId);

  return successResponse({
    res,
    data: {
      user,
      clientProfile,
      accountSummary,
    },
  });
});

export const updateClientProfile = asyncHandeler(async (req, res, next) => {
  const userId = req.user._id;
  const {
    fullName,
    userName,
    phone,
    country,
    bio,
    servicesWanted,
    skills,
  } = req.body;

  if (req.user.role !== roleEnum.client) {
    return next(new Error("not allowed", { cause: 403 }));
  }

  const profile = await dbService.findOne({
    model: clientModel,
    filter: { user: userId },
  });

  if (!profile) {
    return next(new Error("client profile not found", { cause: 404 }));
  }

  const updatedProfile = await dbService.findOneAndUpdate({
    model: clientModel,
    filter: { user: userId },
    data: {
      ...(fullName && { fullName }),
      ...(userName && { userName }),
      ...(phone && { phone }),
      ...(country && { country }),
      ...(bio !== undefined && { bio }),
      ...(servicesWanted && { servicesWanted }),
      ...(skills && { skills }),
    },
  });

  return successResponse({
    res,
    message: "Client profile updated successfully",
    data: { profile: updatedProfile },
  });
});

export const getClientAccountSummary = asyncHandeler(async (req, res, next) => {
  const userId = req.user._id;

  if (req.user.role !== roleEnum.client) {
    return next(new Error("not allowed", { cause: 403 }));
  }

  const summary = await buildClientAccountSummary(userId);

  return successResponse({
    res,
    data: summary,
  });
});
