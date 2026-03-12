import * as dbService from "../../DB/db.service.js";
import { developerModel } from "../../DB/models/developer.model.js";
import { roleEnum, userModel } from "../../DB/models/user.model.js";
import { ratingModel } from "../../DB/models/rating.model.js";
import { projectModel } from "../../DB/models/project.model.js";
import { asyncHandeler, successResponse } from "../../utils/response.js";
import { compareHash, generateHash } from "../../utils/security/hash.security.js";

const rankConfig = {
  Bronze: { min: 0, max: 299 },
  Silver: { min: 300, max: 599 },
  Gold: { min: 600, max: 899 },
  Platinum: { min: 900, max: 1000 },
};

const resolveRankByPoints = (points = 0) => {
  if (points >= rankConfig.Platinum.min) return "Platinum";
  if (points >= rankConfig.Gold.min) return "Gold";
  if (points >= rankConfig.Silver.min) return "Silver";
  return "Bronze";
};

const ensureDeveloperRole = (req, next) => {
  if (req.user?.role !== roleEnum.developer) {
    next(new Error("not allowed", { cause: 403 }));
    return false;
  }

  return true;
};

const getDeveloperProfileOrThrow = async (userId, next) => {
  const profile = await dbService.findOne({
    model: developerModel,
    filter: { user: userId },
  });

  if (!profile) {
    next(new Error("developer profile not found", { cause: 404 }));
    return null;
  }

  return profile;
};

const buildRankProgress = async (developerId, skillsCount = 0) => {
  const ratingAgg = await ratingModel.aggregate([
    { $match: { developer: developerId } },
    {
      $group: {
        _id: "$developer",
        completedProjects: { $addToSet: "$project" },
        performanceScore: { $avg: "$overall" },
      },
    },
  ]);

  const completedProjects = ratingAgg[0]?.completedProjects?.length || 0;
  const performanceScoreRaw = ratingAgg[0]?.performanceScore || 0;
  const performanceScore = Number(performanceScoreRaw.toFixed(1));

  const rawPoints = Math.round(completedProjects * 70 + performanceScore * 40 + skillsCount * 5);
  const points = Math.min(1000, rawPoints);
  const currentRank = resolveRankByPoints(points);

  return {
    currentRank,
    points,
    targetPoints: 1000,
    completedProjects,
    performanceScore,
    progressPercent: Math.round((points / 1000) * 100),
  };
};

export const getMyProfile = asyncHandeler(async (req, res, next) => {
  if (!ensureDeveloperRole(req, next)) return;

  const profile = await getDeveloperProfileOrThrow(req.user._id, next);
  if (!profile) return;

  return successResponse({
    res,
    data: { developerProfile: profile },
  });
});

export const getDeveloperDashboard = asyncHandeler(async (req, res, next) => {
  if (!ensureDeveloperRole(req, next)) return;

  const profile = await getDeveloperProfileOrThrow(req.user._id, next);
  if (!profile) return;

  const rankProgress = await buildRankProgress(req.user._id, profile.skills?.length || 0);

  if (profile.rank !== rankProgress.currentRank || profile.rankPoints !== rankProgress.points) {
    await dbService.findOneAndUpdate({
      model: developerModel,
      filter: { user: req.user._id },
      data: {
        rank: rankProgress.currentRank,
        rankPoints: rankProgress.points,
      },
    });
    profile.rank = rankProgress.currentRank;
    profile.rankPoints = rankProgress.points;
  }

  const autoWorkHistory = await ratingModel
    .find({ developer: req.user._id })
    .populate([{ path: "project", select: "title status" }, { path: "client", select: "email" }])
    .sort({ createdAt: -1 })
    .limit(10);

  const mappedAutoHistory = autoWorkHistory.map((item) => ({
    projectTitle: item.project?.title || "Unknown Project",
    clientName: item.client?.email || "Unknown Client",
    role: profile.title || "Developer",
    duration: "",
    months: 0,
    status: item.project?.status === "completed" ? "completed" : "ongoing",
    rating: item.overall || 0,
    source: "rating",
  }));

  return successResponse({
    res,
    message: "developer dashboard fetched successfully",
    data: {
      profile,
      skills: profile.skills || [],
      portfolio: profile.portfolio || [],
      workHistory: {
        manual: profile.workHistory || [],
        auto: mappedAutoHistory,
      },
      rankProgress,
      availabilitySettings: {
        workingHours: profile.workingHours || "",
        preferredJobTypes: profile.preferredJobTypes || [],
        salaryExpectation: profile.salaryExpectation || "",
        acceptingNewProjects: profile.acceptingNewProjects,
      },
    },
  });
});

export const createDeveloperProfile = asyncHandeler(async (req, res, next) => {
  if (!ensureDeveloperRole(req, next)) return;

  const userId = req.user._id;
  const { fullName, skills, bio = "", title = "", yearsExperience = 0, specialization, experienceLevel } = req.body;

  const exists = await dbService.findOne({
    model: developerModel,
    filter: { user: userId },
  });

  if (exists) {
    return next(new Error("profile already exists", { cause: 409 }));
  }

  const [profile] = await dbService.create({
    model: developerModel,
    data: [
      {
        user: userId,
        fullName,
        skills,
        bio,
        title,
        yearsExperience,
        specialization,
        experienceLevel,
      },
    ],
  });

  return successResponse({
    res,
    status: 201,
    message: "Developer profile created",
    data: { profile },
  });
});

export const updateDeveloperProfile = asyncHandeler(async (req, res, next) => {
  if (!ensureDeveloperRole(req, next)) return;

  const profile = await getDeveloperProfileOrThrow(req.user._id, next);
  if (!profile) return;

  const {
    fullName,
    bio,
    title,
    yearsExperience,
    specialization,
    experienceLevel,
    availability,
    isOnline,
    githubUrl,
  } = req.body;

  const updatedProfile = await dbService.findOneAndUpdate({
    model: developerModel,
    filter: { user: req.user._id },
    data: {
      ...(fullName !== undefined && { fullName }),
      ...(bio !== undefined && { bio }),
      ...(title !== undefined && { title }),
      ...(yearsExperience !== undefined && { yearsExperience }),
      ...(specialization !== undefined && { specialization }),
      ...(experienceLevel !== undefined && { experienceLevel }),
      ...(availability !== undefined && { availability }),
      ...(isOnline !== undefined && { isOnline }),
      ...(githubUrl !== undefined && { githubUrl }),
    },
  });

  return successResponse({
    res,
    message: "Developer profile updated successfully",
    data: { profile: updatedProfile },
  });
});

export const updateDeveloperSkills = asyncHandeler(async (req, res, next) => {
  if (!ensureDeveloperRole(req, next)) return;

  const { skills } = req.body;

  const updatedProfile = await dbService.findOneAndUpdate({
    model: developerModel,
    filter: { user: req.user._id },
    data: { skills },
  });

  if (!updatedProfile) {
    return next(new Error("developer profile not found", { cause: 404 }));
  }

  return successResponse({
    res,
    message: "Developer skills updated successfully",
    data: { profile: updatedProfile },
  });
});

export const addSkill = asyncHandeler(async (req, res, next) => {
  if (!ensureDeveloperRole(req, next)) return;

  const { skill } = req.body;

  const profile = await getDeveloperProfileOrThrow(req.user._id, next);
  if (!profile) return;

  const normalizedSkill = skill.trim();
  const hasSkill = (profile.skills || []).some(
    (item) => item.toLowerCase() === normalizedSkill.toLowerCase()
  );

  if (hasSkill) {
    return next(new Error("skill already exists", { cause: 409 }));
  }

  const updatedProfile = await dbService.findOneAndUpdate({
    model: developerModel,
    filter: { user: req.user._id },
    data: {
      skills: [...(profile.skills || []), normalizedSkill],
    },
  });

  return successResponse({
    res,
    status: 201,
    message: "skill added successfully",
    data: { profile: updatedProfile },
  });
});

export const removeSkill = asyncHandeler(async (req, res, next) => {
  if (!ensureDeveloperRole(req, next)) return;

  const { skill } = req.params;

  const profile = await getDeveloperProfileOrThrow(req.user._id, next);
  if (!profile) return;

  const updatedSkills = (profile.skills || []).filter(
    (item) => item.toLowerCase() !== skill.toLowerCase()
  );

  const updatedProfile = await dbService.findOneAndUpdate({
    model: developerModel,
    filter: { user: req.user._id },
    data: { skills: updatedSkills },
  });

  return successResponse({
    res,
    message: "skill removed successfully",
    data: { profile: updatedProfile },
  });
});

export const addPortfolioItem = asyncHandeler(async (req, res, next) => {
  if (!ensureDeveloperRole(req, next)) return;

  const profile = await getDeveloperProfileOrThrow(req.user._id, next);
  if (!profile) return;

  const {
    title,
    description,
    technologies = [],
    roleInProject = "",
    projectUrl = "",
    githubUrl = "",
  } = req.body;

  const updatedProfile = await dbService.findOneAndUpdate({
    model: developerModel,
    filter: { user: req.user._id },
    data: {
      $push: {
        portfolio: {
          title,
          description,
          technologies,
          roleInProject,
          projectUrl,
          githubUrl,
        },
      },
    },
  });

  return successResponse({
    res,
    status: 201,
    message: "portfolio item added successfully",
    data: { profile: updatedProfile },
  });
});

export const updatePortfolioItem = asyncHandeler(async (req, res, next) => {
  if (!ensureDeveloperRole(req, next)) return;

  const { itemId } = req.params;

  const profile = await getDeveloperProfileOrThrow(req.user._id, next);
  if (!profile) return;

  const itemIndex = (profile.portfolio || []).findIndex(
    (item) => String(item._id) === String(itemId)
  );

  if (itemIndex === -1) {
    return next(new Error("portfolio item not found", { cause: 404 }));
  }

  const current = profile.portfolio[itemIndex];
  const updatedItem = {
    ...current.toObject(),
    ...req.body,
  };

  const updatedPortfolio = [...profile.portfolio];
  updatedPortfolio[itemIndex] = updatedItem;

  const updatedProfile = await dbService.findOneAndUpdate({
    model: developerModel,
    filter: { user: req.user._id },
    data: { portfolio: updatedPortfolio },
  });

  return successResponse({
    res,
    message: "portfolio item updated successfully",
    data: { profile: updatedProfile },
  });
});

export const deletePortfolioItem = asyncHandeler(async (req, res, next) => {
  if (!ensureDeveloperRole(req, next)) return;

  const { itemId } = req.params;

  const profile = await getDeveloperProfileOrThrow(req.user._id, next);
  if (!profile) return;

  const updatedPortfolio = (profile.portfolio || []).filter(
    (item) => String(item._id) !== String(itemId)
  );

  const updatedProfile = await dbService.findOneAndUpdate({
    model: developerModel,
    filter: { user: req.user._id },
    data: { portfolio: updatedPortfolio },
  });

  return successResponse({
    res,
    message: "portfolio item deleted successfully",
    data: { profile: updatedProfile },
  });
});

export const addWorkHistoryItem = asyncHandeler(async (req, res, next) => {
  if (!ensureDeveloperRole(req, next)) return;

  const profile = await getDeveloperProfileOrThrow(req.user._id, next);
  if (!profile) return;

  const {
    projectTitle,
    clientName,
    role,
    duration = "",
    months = 0,
    status = "completed",
    rating = 0,
  } = req.body;

  const updatedProfile = await dbService.findOneAndUpdate({
    model: developerModel,
    filter: { user: req.user._id },
    data: {
      $push: {
        workHistory: {
          projectTitle,
          clientName,
          role,
          duration,
          months,
          status,
          rating,
        },
      },
    },
  });

  return successResponse({
    res,
    status: 201,
    message: "work history item added successfully",
    data: { profile: updatedProfile },
  });
});

export const getWorkHistory = asyncHandeler(async (req, res, next) => {
  if (!ensureDeveloperRole(req, next)) return;

  const profile = await getDeveloperProfileOrThrow(req.user._id, next);
  if (!profile) return;

  const autoWorkHistory = await ratingModel
    .find({ developer: req.user._id })
    .populate([{ path: "project", select: "title status" }, { path: "client", select: "email" }])
    .sort({ createdAt: -1 })
    .limit(20);

  return successResponse({
    res,
    data: {
      manual: profile.workHistory || [],
      auto: autoWorkHistory.map((item) => ({
        projectTitle: item.project?.title || "Unknown Project",
        clientName: item.client?.email || "Unknown Client",
        role: profile.title || "Developer",
        duration: "",
        months: 0,
        status: item.project?.status === "completed" ? "completed" : "ongoing",
        rating: item.overall || 0,
      })),
    },
  });
});

export const getRankProgress = asyncHandeler(async (req, res, next) => {
  if (!ensureDeveloperRole(req, next)) return;

  const profile = await getDeveloperProfileOrThrow(req.user._id, next);
  if (!profile) return;

  const rankProgress = await buildRankProgress(req.user._id, profile.skills?.length || 0);

  const updatedProfile = await dbService.findOneAndUpdate({
    model: developerModel,
    filter: { user: req.user._id },
    data: {
      rank: rankProgress.currentRank,
      rankPoints: rankProgress.points,
    },
  });

  return successResponse({
    res,
    data: {
      rankProgress,
      profile: updatedProfile,
    },
  });
});

export const updateAvailabilitySettings = asyncHandeler(async (req, res, next) => {
  if (!ensureDeveloperRole(req, next)) return;

  const { workingHours, preferredJobTypes, salaryExpectation, acceptingNewProjects } = req.body;

  const updatedProfile = await dbService.findOneAndUpdate({
    model: developerModel,
    filter: { user: req.user._id },
    data: {
      ...(workingHours !== undefined && { workingHours }),
      ...(preferredJobTypes !== undefined && { preferredJobTypes }),
      ...(salaryExpectation !== undefined && { salaryExpectation }),
      ...(acceptingNewProjects !== undefined && { acceptingNewProjects }),
    },
  });

  if (!updatedProfile) {
    return next(new Error("developer profile not found", { cause: 404 }));
  }

  return successResponse({
    res,
    message: "availability settings updated successfully",
    data: { profile: updatedProfile },
  });
});

export const changeDeveloperPassword = asyncHandeler(async (req, res, next) => {
  if (!ensureDeveloperRole(req, next)) return;

  const { oldPassword, newPassword } = req.body;

  const user = await dbService.findOne({
    model: userModel,
    filter: { _id: req.user._id },
  });

  if (!user) {
    return next(new Error("invalid account", { cause: 404 }));
  }

  const matchedPassword = await compareHash({
    plaintext: oldPassword,
    hashValue: user.password,
  });

  if (!matchedPassword) {
    return next(new Error("invalid old password", { cause: 400 }));
  }

  await dbService.findOneAndUpdate({
    model: userModel,
    filter: { _id: req.user._id },
    data: {
      password: await generateHash({ plaintext: newPassword, saltRound: 12 }),
      changeCredentialsTime: new Date(),
    },
  });

  return successResponse({
    res,
    message: "password updated successfully",
  });
});
