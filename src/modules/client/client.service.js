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

const ensureClientProfile = async (userId, defaults = {}) => {
  const existing = await dbService.findOne({
    model: clientModel,
    filter: { user: userId },
  });

  if (existing) return existing;

  const [profile] = await dbService.create({
    model: clientModel,
    data: [
      {
        user: userId,
        fullName: defaults.fullName || defaults.email || "Client",
        userName: defaults.userName || "",
        phone: defaults.phone || "",
        country: defaults.country || "",
        bio: defaults.bio || "",
        servicesWanted: defaults.servicesWanted || [],
        skills: defaults.skills || [],
      },
    ],
  });

  return profile;
};

const buildClientProfileResponse = async (userId) => {
  const user = await dbService.findOne({
    model: userModel,
    filter: { _id: userId },
    select: "email role createdAt",
  });

  if (!user) return null;

  const clientProfile = await ensureClientProfile(userId, {
    email: user.email,
  });
  const accountSummary = await buildClientAccountSummary(userId);

  return {
    user,
    clientProfile,
    profile: {
      clientId: clientProfile._id,
      userId,
      fullName: clientProfile.fullName,
      userName: clientProfile.userName || "",
      email: user.email,
      phone: clientProfile.phone || "",
      country: clientProfile.country || "",
      bio: clientProfile.bio || "",
      servicesWanted: clientProfile.servicesWanted || [],
      skills: clientProfile.skills || [],
      profileImage: clientProfile.profileImage?.url || "",
      accountType: user.role,
      ...accountSummary,
    },
    accountSummary,
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

  const payload = await buildClientProfileResponse(userId);

  if (!payload) {
    return next(new Error("invalid account", { cause: 404 }));
  }

  return successResponse({
    res,
    data: payload,
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

  await ensureClientProfile(userId, req.body);

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

  const payload = await buildClientProfileResponse(userId);

  return successResponse({
    res,
    message: "Client profile updated successfully",
    data: {
      ...payload,
      updatedProfile,
    },
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
