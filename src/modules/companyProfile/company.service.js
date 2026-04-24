import { companyModel } from "../../DB/models/company.model.js";
import { jobModel } from "../../DB/models/jop.model.js";
import { interviewModel } from "../../DB/models/interview.model.js";
import { applicationModel } from "../../DB/models/application.model.js";
import { developerModel } from "../../DB/models/developer.model.js";
import { ratingModel } from "../../DB/models/rating.model.js";
import { roleEnum } from "../../DB/models/user.model.js";
import { asyncHandeler, successResponse } from "../../utils/response.js";
import * as dbService from "../../DB/db.service.js";

const ensureCompanyRole = (req, next) => {
  if (req.user?.role !== roleEnum.company) {
    return next(new Error("only company can access this endpoint", { cause: 403 }));
  }

  return null;
};

const getOwnedJobOrThrow = async ({ companyId, jobId, next }) => {
  const job = await dbService.findOne({
    model: jobModel,
    filter: { _id: jobId, company: companyId },
  });

  if (!job) {
    next(new Error("job not found", { cause: 404 }));
    return null;
  }

  return job;
};

const normalizeTypeFromWorkType = (workType = "freelance-contract") =>
  workType === "full-time" ? "full-time" : "contract";

const toJobCard = (job) => ({
  jobId: job._id,
  title: job.title,
  status: job.status,
  workMode: job.workMode,
  workType: job.workType || null,
  type: job.type,
  location: job.location || "",
  budget: {
    value: job.budget,
    min: job.budgetMin,
    max: job.budgetMax,
  },
  applicationsCount: job.applicationsCount || 0,
  postedAt: job.createdAt,
});

export const getMyCompanyDashboard = asyncHandeler(async (req, res, next) => {
  const roleError = ensureCompanyRole(req, next);
  if (roleError) return;

  const companyProfile = await dbService.findOne({
    model: companyModel,
    filter: { user: req.user._id },
  });

  if (!companyProfile) {
    return next(new Error("company profile not found", { cause: 404 }));
  }

  const jobs = await dbService.find({
    model: jobModel,
    filter: { company: req.user._id },
    options: { sort: { createdAt: -1 } },
  });

  const activeJobs = jobs.filter((job) => job.status === "active").length;
  const closedJobs = jobs.filter((job) => job.status === "closed").length;
  const totalApplications = jobs.reduce(
    (sum, job) => sum + (job.applicationsCount || 0),
    0
  );

  return successResponse({
    res,
    message: "company dashboard fetched successfully",
    data: {
      profile: companyProfile,
      stats: {
        activeJobs,
        closedJobs,
        totalApplications,
      },
      postedJobs: jobs,
    },
  });
});

export const updateMyCompanyProfile = asyncHandeler(async (req, res, next) => {
  const roleError = ensureCompanyRole(req, next);
  if (roleError) return;

  const { companyName, companySize, website, contactEmail, location } = req.body;

  const updated = await dbService.findOneAndUpdate({
    model: companyModel,
    filter: { user: req.user._id },
    data: {
      ...(companyName && { companyName }),
      ...(companySize && { companySize }),
      ...(website && { website }),
      ...(contactEmail && { contactEmail }),
      ...(location && { location }),
    },
  });

  if (!updated) {
    return next(new Error("company profile not found", { cause: 404 }));
  }

  return successResponse({
    res,
    message: "company profile updated successfully",
    data: { profile: updated },
  });
});

export const updateCompanyAbout = asyncHandeler(async (req, res, next) => {
  const roleError = ensureCompanyRole(req, next);
  if (roleError) return;

  const { description, projectTypes } = req.body;

  const updated = await dbService.findOneAndUpdate({
    model: companyModel,
    filter: { user: req.user._id },
    data: {
      ...(description !== undefined && { description }),
      ...(projectTypes && { projectTypes }),
    },
  });

  if (!updated) {
    return next(new Error("company profile not found", { cause: 404 }));
  }

  return successResponse({
    res,
    message: "company about updated successfully",
    data: { profile: updated },
  });
});

export const createJob = asyncHandeler(async (req, res, next) => {
  const roleError = ensureCompanyRole(req, next);
  if (roleError) return;

  const {
    title,
    description,
    type,
    workType,
    workMode,
    location = "",
    skills = [],
    budget = null,
    budgetMin = null,
    budgetMax = null,
    estimatedDuration = "",
  } = req.body;

  const [job] = await dbService.create({
    model: jobModel,
    data: [
      {
        company: req.user._id,
        title,
        description,
        type: type || normalizeTypeFromWorkType(workType),
        workType: workType || (type === "full-time" ? "full-time" : "freelance-contract"),
        workMode,
        location,
        skills,
        budget,
        budgetMin,
        budgetMax,
        estimatedDuration,
      },
    ],
  });

  return successResponse({
    res,
    status: 201,
    message: "job created successfully",
    data: { job },
  });
});

export const getMyJobPosts = asyncHandeler(async (req, res, next) => {
  const roleError = ensureCompanyRole(req, next);
  if (roleError) return;

  const jobs = await dbService.find({
    model: jobModel,
    filter: { company: req.user._id },
    options: { sort: { createdAt: -1 } },
  });

  const totalPosts = jobs.length;
  const openPosts = jobs.filter((job) => job.status === "active").length;
  const closedPosts = jobs.filter((job) => job.status === "closed").length;
  const totalApplications = jobs.reduce(
    (sum, job) => sum + (job.applicationsCount || 0),
    0
  );

  return successResponse({
    res,
    message: "my job posts fetched successfully",
    data: {
      stats: {
        totalPosts,
        openPosts,
        closedPosts,
        activePosts: openPosts,
        appliedProjects: openPosts,
        totalApplications,
      },
      jobs: jobs.map(toJobCard),
    },
  });
});

export const getMyJobDetails = asyncHandeler(async (req, res, next) => {
  const roleError = ensureCompanyRole(req, next);
  if (roleError) return;

  const { jobId } = req.params;
  const job = await getOwnedJobOrThrow({ companyId: req.user._id, jobId, next });
  if (!job) return;

  const [stats] = await applicationModel.aggregate([
    { $match: { job: job._id } },
    {
      $group: {
        _id: "$job",
        totalApplications: { $sum: 1 },
        pendingApplications: {
          $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
        },
        acceptedApplications: {
          $sum: { $cond: [{ $eq: ["$status", "accepted"] }, 1, 0] },
        },
        rejectedApplications: {
          $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] },
        },
      },
    },
  ]);

  return successResponse({
    res,
    message: "job details fetched successfully",
    data: {
      job: {
        ...toJobCard(job),
        description: job.description,
        skills: job.skills || [],
        estimatedDuration: job.estimatedDuration || "",
      },
      applications: {
        total: stats?.totalApplications || 0,
        pending: stats?.pendingApplications || 0,
        accepted: stats?.acceptedApplications || 0,
        rejected: stats?.rejectedApplications || 0,
      },
    },
  });
});

export const updateMyJob = asyncHandeler(async (req, res, next) => {
  const roleError = ensureCompanyRole(req, next);
  if (roleError) return;

  const { jobId } = req.params;
  const payload = req.body;

  const job = await getOwnedJobOrThrow({ companyId: req.user._id, jobId, next });
  if (!job) return;

  const data = {
    ...(payload.title !== undefined && { title: payload.title }),
    ...(payload.description !== undefined && { description: payload.description }),
    ...(payload.type !== undefined && { type: payload.type }),
    ...(payload.workType !== undefined && {
      workType: payload.workType,
      ...(payload.type === undefined && {
        type: normalizeTypeFromWorkType(payload.workType),
      }),
    }),
    ...(payload.workMode !== undefined && { workMode: payload.workMode }),
    ...(payload.location !== undefined && { location: payload.location }),
    ...(payload.skills !== undefined && { skills: payload.skills }),
    ...(payload.budget !== undefined && { budget: payload.budget }),
    ...(payload.budgetMin !== undefined && { budgetMin: payload.budgetMin }),
    ...(payload.budgetMax !== undefined && { budgetMax: payload.budgetMax }),
    ...(payload.estimatedDuration !== undefined && {
      estimatedDuration: payload.estimatedDuration,
    }),
  };

  const updatedJob = await dbService.findOneAndUpdate({
    model: jobModel,
    filter: { _id: jobId, company: req.user._id },
    data,
  });

  return successResponse({
    res,
    message: "job updated successfully",
    data: { job: updatedJob },
  });
});

export const deleteMyJob = asyncHandeler(async (req, res, next) => {
  const roleError = ensureCompanyRole(req, next);
  if (roleError) return;

  const { jobId } = req.params;
  const job = await getOwnedJobOrThrow({ companyId: req.user._id, jobId, next });
  if (!job) return;

  await applicationModel.deleteMany({ job: jobId, company: req.user._id });
  await jobModel.deleteOne({ _id: jobId, company: req.user._id });

  return successResponse({
    res,
    message: "job deleted successfully",
  });
});

export const updateJobStatus = asyncHandeler(async (req, res, next) => {
  const roleError = ensureCompanyRole(req, next);
  if (roleError) return;

  const { jobId } = req.params;
  const { status } = req.body;

  const updatedJob = await dbService.findOneAndUpdate({
    model: jobModel,
    filter: { _id: jobId, company: req.user._id },
    data: { status },
  });

  if (!updatedJob) {
    return next(new Error("job not found", { cause: 404 }));
  }

  return successResponse({
    res,
    message: "job status updated successfully",
    data: { job: updatedJob },
  });
});

export const getJobApplicants = asyncHandeler(async (req, res, next) => {
  const roleError = ensureCompanyRole(req, next);
  if (roleError) return;

  const { jobId } = req.params;
  const { page = 1, limit = 10, status } = req.query;

  const job = await getOwnedJobOrThrow({ companyId: req.user._id, jobId, next });
  if (!job) return;

  const pageNumber = Number(page);
  const limitNumber = Number(limit);
  const skip = (pageNumber - 1) * limitNumber;

  const filter = {
    company: req.user._id,
    job: jobId,
    ...(status ? { status } : {}),
  };

  const totalItems = await applicationModel.countDocuments(filter);

  const applications = await applicationModel
    .find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNumber)
    .populate([{ path: "developer", select: "email" }]);

  const developerIds = applications.map((item) => item.developer?._id).filter(Boolean);

  const profiles = await developerModel.find({
    user: { $in: developerIds },
  });

  const profileMap = new Map(profiles.map((profile) => [String(profile.user), profile]));

  const ratings = await ratingModel.aggregate([
    { $match: { developer: { $in: developerIds } } },
    {
      $group: {
        _id: "$developer",
        average: { $avg: "$overall" },
      },
    },
  ]);

  const ratingMap = new Map(ratings.map((item) => [String(item._id), item.average]));

  const applicants = applications.map((application) => {
    const devId = String(application.developer?._id || "");
    const profile = profileMap.get(devId);
    const avg = ratingMap.get(devId);
    const averageRating = avg ? Number(avg.toFixed(1)) : 0;

    let badge = "new";
    if (averageRating >= 4.5) badge = "top-rated";
    else if (averageRating > 0) badge = "rated";

    return {
      applicationId: application._id,
      status: application.status,
      proposedBudget: application.proposedBudget,
      submittedAt: application.createdAt,
      developer: {
        userId: application.developer?._id || null,
        email: application.developer?.email || "",
        fullName: profile?.fullName || "Unknown Developer",
        title: profile?.title || "",
        rank: profile?.rank || "Bronze",
        averageRating,
        skills: profile?.skills || [],
        badge,
      },
    };
  });

  const pendingCount = await applicationModel.countDocuments({
    company: req.user._id,
    status: "pending",
  });

  return successResponse({
    res,
    message: "job applicants fetched successfully",
    data: {
      job: {
        jobId: job._id,
        title: job.title,
        status: job.status,
      },
      pendingStats: {
        currentJobPending: applicants.filter((item) => item.status === "pending").length,
        totalPendingForCompany: pendingCount,
      },
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        totalItems,
        totalPages: Math.ceil(totalItems / limitNumber) || 1,
      },
      applicants,
    },
  });
});

export const updateApplicationStatus = asyncHandeler(async (req, res, next) => {
  const roleError = ensureCompanyRole(req, next);
  if (roleError) return;

  const { applicationId } = req.params;
  const { status } = req.body;

  const application = await dbService.findOne({
    model: applicationModel,
    filter: { _id: applicationId, company: req.user._id },
  });

  if (!application) {
    return next(new Error("application not found", { cause: 404 }));
  }

  const updated = await dbService.findOneAndUpdate({
    model: applicationModel,
    filter: { _id: applicationId, company: req.user._id },
    data: { status },
  });

  return successResponse({
    res,
    message: `application ${status} successfully`,
    data: { application: updated },
  });
});

export const getMyInterviews = asyncHandeler(async (req, res, next) => {
  const roleError = ensureCompanyRole(req, next);
  if (roleError) return;

  const now = new Date();

  const interviews = await dbService.find({
    model: interviewModel,
    filter: { company: req.user._id },
    options: { sort: { scheduledAt: -1 } },
  });

  const upcoming = interviews.filter(
    (item) => item.status === "upcoming" && new Date(item.scheduledAt) >= now
  );

  const past = interviews.filter(
    (item) => item.status !== "upcoming" || new Date(item.scheduledAt) < now
  );

  return successResponse({
    res,
    message: "interviews fetched successfully",
    data: {
      upcoming,
      past,
      total: interviews.length,
    },
  });
});

export const createInterview = asyncHandeler(async (req, res, next) => {
  const roleError = ensureCompanyRole(req, next);
  if (roleError) return;

  const {
    candidateName,
    jobTitle,
    interviewType = "technical",
    mode = "onsite",
    scheduledAt,
  } = req.body;

  const [interview] = await dbService.create({
    model: interviewModel,
    data: [
      {
        company: req.user._id,
        candidateName,
        jobTitle,
        interviewType,
        mode,
        scheduledAt,
      },
    ],
  });

  return successResponse({
    res,
    status: 201,
    message: "interview scheduled successfully",
    data: { interview },
  });
});
