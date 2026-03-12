import { companyModel } from "../../DB/models/company.model.js";
import { jobModel } from "../../DB/models/jop.model.js";
import { interviewModel } from "../../DB/models/interview.model.js";
import { roleEnum } from "../../DB/models/user.model.js";
import { asyncHandeler, successResponse } from "../../utils/response.js";
import * as dbService from "../../DB/db.service.js";

const ensureCompanyRole = (req, next) => {
  if (req.user?.role !== roleEnum.company) {
    return next(new Error("only company can access this endpoint", { cause: 403 }));
  }

  return null;
};

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

  const { title, description, type, workMode, skills = [] } = req.body;

  const [job] = await dbService.create({
    model: jobModel,
    data: [
      {
        company: req.user._id,
        title,
        description,
        type,
        workMode,
        skills,
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
