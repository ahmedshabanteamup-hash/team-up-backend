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

const applicationStatusLabelMap = {
  pending: "New",
  shortlisted: "Shortlisted",
  interviewed: "Interviewed",
  accepted: "Accepted",
  rejected: "Rejected",
};

const formatJobType = (type = "") => {
  if (type === "full-time") return "Full-Time";
  if (type === "part-time") return "Part-Time";
  return "Contract";
};

const formatBudgetRange = (job) => {
  if (job.budgetMin && job.budgetMax) return `$${job.budgetMin} - $${job.budgetMax}`;
  if (job.budget) return `$${job.budget}`;
  if (job.budgetMin) return `From $${job.budgetMin}`;
  if (job.budgetMax) return `Up to $${job.budgetMax}`;
  return "Not specified";
};

const toJobCard = (job) => ({
  jobId: job._id,
  title: job.title,
  status: job.status,
  publicationStatus: job.publicationStatus,
  workMode: job.workMode,
  workType: job.workType || null,
  type: job.type,
  location: job.location || "",
  experienceLevel: job.experienceLevel || null,
  deadline: job.deadline || null,
  teamSize: job.teamSize || null,
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

  const jobIds = jobs.map((job) => job._id);
  const now = new Date();

  const [applications, interviews] = await Promise.all([
    applicationModel
      .find({
        company: req.user._id,
        ...(jobIds.length ? { job: { $in: jobIds } } : {}),
      })
      .sort({ createdAt: -1 })
      .limit(30)
      .populate([
        { path: "developer", select: "email" },
        { path: "job", select: "title" },
      ]),
    interviewModel
      .find({ company: req.user._id })
      .sort({ scheduledAt: 1 })
      .limit(20),
  ]);

  const developerIds = applications.map((app) => app.developer?._id).filter(Boolean);

  const [developers, ratings] = await Promise.all([
    developerModel.find({ user: { $in: developerIds } }),
    ratingModel.aggregate([
      { $match: { developer: { $in: developerIds } } },
      {
        $group: {
          _id: "$developer",
          average: { $avg: "$overall" },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const developerProfileMap = new Map(
    developers.map((profile) => [String(profile.user), profile])
  );
  const ratingMap = new Map(
    ratings.map((item) => [
      String(item._id),
      { average: Number((item.average || 0).toFixed(1)), count: item.count || 0 },
    ])
  );

  const activeJobs = jobs.filter((job) => job.status === "active").length;
  const totalApplicants = applications.length;
  const pendingInterviews = interviews.filter(
    (item) => item.status === "upcoming" && new Date(item.scheduledAt) >= now
  ).length;
  const hiredDevelopers = applications.filter((item) => item.status === "accepted").length;

  const jobsOverview = jobs.slice(0, 5).map((job) => ({
    jobId: job._id,
    jobTitle: job.title,
    jobType: job.type,
    applicantsCount: job.applicationsCount || 0,
    status: job.status === "active" ? "open" : "closed",
    actions: {
      viewApplicants: `/company/jobs/${job._id}/applicants`,
      edit: `/company/jobs/${job._id}`,
      closeJob: `/company/jobs/${job._id}/status`,
    },
  }));

  const applicantsOverview = applications.slice(0, 6).map((application) => {
    const devId = String(application.developer?._id || "");
    const profile = developerProfileMap.get(devId);
    const skills = (profile?.skills || []).slice(0, 5);

    return {
      applicationId: application._id,
      developerId: application.developer?._id || null,
      developerName: profile?.fullName || "Unknown Developer",
      skills,
      cvUrl: profile?.cv?.url || "",
      portfolio: profile?.portfolio || [],
      appliedJobTitle: application.job?.title || "",
      status: application.status,
      actions: {
        viewProfile: `/developers/${application.developer?._id || ""}`,
        scheduleInterview: "/company/interviews",
        reject: `/company/applications/${application._id}/status`,
      },
    };
  });

  const upcomingInterviews = interviews
    .filter((item) => new Date(item.scheduledAt) >= now)
    .slice(0, 6)
    .map((item) => ({
      interviewId: item._id,
      interviewDate: item.scheduledAt,
      developerName: item.candidateName,
      jobTitle: item.jobTitle,
      status: item.status,
      actions: {
        viewDetails: `/company/interviews`,
        reschedule: `/company/interviews/${item._id}`,
        updateStatus: `/company/interviews/${item._id}`,
      },
    }));

  const notifications = [
    ...applications.slice(0, 3).map((application) => ({
      type: "applicant",
      message: `New applicant applied for ${
        application.job?.title || "a job post"
      }.`,
      createdAt: application.createdAt,
    })),
    ...interviews.slice(0, 2).map((item) => ({
      type: "interview",
      message: `${item.candidateName} interview is ${item.status}.`,
      createdAt: item.updatedAt,
    })),
    ...jobs
      .filter((job) => job.status === "closed")
      .slice(0, 1)
      .map((job) => ({
        type: "job",
        message: `Job post ${job.title} was closed.`,
        createdAt: job.updatedAt,
      })),
  ]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 6);

  const suggestedDevelopers = developers.slice(0, 5).map((profile) => {
    const rating = ratingMap.get(String(profile.user));
    return {
      developerId: profile.user,
      name: profile.fullName,
      skills: (profile.skills || []).slice(0, 5),
      rank: profile.rank || "Bronze",
      rating: rating?.average || 0,
      availability: profile.availability || "available",
      actions: {
        viewProfile: `/developers/${profile.user}`,
        inviteToInterview: "/company/interviews",
      },
    };
  });

  return successResponse({
    res,
    message: "company dashboard fetched successfully",
    data: {
      header: {
        companyLogo: companyProfile.logo?.url || "",
        companyName: companyProfile.companyName,
        companyType: companyProfile.industry || "Software House",
      },
      profile: companyProfile,
      stats: {
        activeJobPosts: activeJobs,
        totalApplicants,
        pendingInterviews,
        hiredDevelopers,
      },
      quickActions: {
        postNewJob: "/company/jobs",
        viewMyJobPosts: "/company/jobs/my-posts",
        viewApplicants: "/company/jobs/:jobId/applicants",
        browseDevelopers: "/developers",
        scheduleInterview: "/company/interviews",
      },
      jobPostsOverview: jobsOverview,
      applicantsOverview,
      interviewsOverview: upcomingInterviews,
      notifications,
      suggestedDevelopers,
      connectedPages: {
        postJobHiringPage: "/company/jobs",
        companyJobPostsPage: "/company/jobs/my-posts",
        applicantsListPage: "/company/jobs/:jobId/applicants",
      },
      postedJobs: jobs.map(toJobCard),
    },
  });
});

export const updateMyCompanyProfile = asyncHandeler(async (req, res, next) => {
  const roleError = ensureCompanyRole(req, next);
  if (roleError) return;

  const { companyName, companySize, industry, website, contactEmail, location } = req.body;

  const updated = await dbService.findOneAndUpdate({
    model: companyModel,
    filter: { user: req.user._id },
    data: {
      ...(companyName && { companyName }),
      ...(companySize && { companySize }),
      ...(industry && { industry }),
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

export const updateCompanyLogo = asyncHandeler(async (req, res, next) => {
  const roleError = ensureCompanyRole(req, next);
  if (roleError) return;

  if (!req.file) {
    return next(new Error("image is required", { cause: 400 }));
  }

  const logoUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;

  const updated = await dbService.findOneAndUpdate({
    model: companyModel,
    filter: { user: req.user._id },
    data: {
      logo: {
        url: logoUrl,
        public_id: req.file.filename,
      },
    },
  });

  if (!updated) {
    return next(new Error("company profile not found", { cause: 404 }));
  }

  return successResponse({
    res,
    message: "company logo updated successfully",
    data: {
      logo: updated.logo,
      profile: updated,
    },
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
    requirements = "",
    type,
    workType,
    workMode,
    location = "",
    skills = [],
    experienceLevel = null,
    budget = null,
    budgetMin = null,
    budgetMax = null,
    estimatedDuration = "",
    deadline = null,
    teamSize = null,
    publicationStatus = "published",
  } = req.body;

  const [job] = await dbService.create({
    model: jobModel,
    data: [
      {
        company: req.user._id,
        title,
        description,
        requirements,
        type: type || normalizeTypeFromWorkType(workType),
        workType: workType || (type === "full-time" ? "full-time" : "freelance-contract"),
        workMode,
        location,
        skills,
        experienceLevel,
        budget,
        budgetMin,
        budgetMax,
        estimatedDuration,
        deadline,
        teamSize,
        publicationStatus,
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

  const { page = 1, limit = 10, search = "", status } = req.query;

  const pageNumber = Number(page);
  const limitNumber = Number(limit);
  const skip = (pageNumber - 1) * limitNumber;

  const normalizedSearch = String(search || "").trim();

  const filter = {
    company: req.user._id,
    ...(status ? { status } : {}),
    ...(normalizedSearch
      ? {
          $or: [
            { title: { $regex: normalizedSearch, $options: "i" } },
            { type: { $regex: normalizedSearch, $options: "i" } },
            { workMode: { $regex: normalizedSearch, $options: "i" } },
          ],
        }
      : {}),
  };

  const [totalPosts, jobs] = await Promise.all([
    jobModel.countDocuments(filter),
    jobModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber),
  ]);

  const [allCompanyJobs, weeklyNewPosts] = await Promise.all([
    jobModel.find({ company: req.user._id }),
    jobModel.countDocuments({
      company: req.user._id,
      status: "active",
      createdAt: {
        $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
    }),
  ]);

  const openPosts = allCompanyJobs.filter((job) => job.status === "active").length;
  const closedPosts = allCompanyJobs.filter((job) => job.status === "closed").length;
  const totalApplications = allCompanyJobs.reduce(
    (sum, job) => sum + (job.applicationsCount || 0),
    0
  );

  const rows = jobs.map((job) => ({
    jobId: job._id,
    jobTitle: job.title,
    jobType: job.type,
    applicantsCount: job.applicationsCount || 0,
    status: job.status === "active" ? "open" : "closed",
    datePosted: job.createdAt,
    actions: {
      viewApplicants: `/company/jobs/${job._id}/applicants`,
      edit: `/company/jobs/${job._id}`,
      closeJob: `/company/jobs/${job._id}/status`,
    },
  }));

  const totalPages = Math.ceil(totalPosts / limitNumber) || 1;
  const showingFrom = totalPosts === 0 ? 0 : skip + 1;
  const showingTo = Math.min(skip + rows.length, totalPosts);

  return successResponse({
    res,
    message: "my job posts fetched successfully",
    data: {
      header: {
        pageTitle: "Company Job Posts",
        searchPlaceholder: "Search jobs...",
        primaryAction: {
          label: "Create New Job",
          endpoint: "/company/jobs",
          method: "POST",
        },
      },
      stats: {
        totalJobPosts: allCompanyJobs.length,
        totalActiveJobs: openPosts,
        totalApplicants: totalApplications,
        newActiveJobsThisWeek: weeklyNewPosts,
        openPosts,
        closedPosts,
      },
      table: {
        columns: [
          "jobTitle",
          "jobType",
          "applicantsCount",
          "status",
          "datePosted",
          "actions",
        ],
        rows,
      },
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        totalItems: totalPosts,
        totalPages,
        showingFrom,
        showingTo,
        summaryText: `Showing ${showingFrom} to ${showingTo} of ${totalPosts} results`,
      },
      filters: {
        status: status || null,
        search: normalizedSearch,
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
        shortlistedApplications: {
          $sum: { $cond: [{ $eq: ["$status", "shortlisted"] }, 1, 0] },
        },
        interviewedApplications: {
          $sum: { $cond: [{ $eq: ["$status", "interviewed"] }, 1, 0] },
        },
      },
    },
  ]);

  const applications = await applicationModel
    .find({ job: job._id, company: req.user._id })
    .sort({ createdAt: -1 })
    .limit(20)
    .populate([{ path: "developer", select: "email" }]);

  const developerIds = applications.map((item) => item.developer?._id).filter(Boolean);
  const profiles = await developerModel.find({ user: { $in: developerIds } });
  const profileMap = new Map(profiles.map((profile) => [String(profile.user), profile]));

  return successResponse({
    res,
    message: "job details fetched successfully",
    data: {
      header: {
        title: job.title,
        status: job.status,
        statusLabel: job.status === "active" ? "Active" : "Closed",
        postedAt: job.createdAt,
      },
      summaryCards: {
        salary: formatBudgetRange(job),
        location: job.location || job.workMode || "",
        type: formatJobType(job.type),
        deadline: job.deadline || null,
      },
      job: {
        ...toJobCard(job),
        description: job.description,
        skills: job.skills || [],
        estimatedDuration: job.estimatedDuration || "",
        publicationStatus: job.publicationStatus,
        requirements: job.requirements || "",
        salaryLabel: formatBudgetRange(job),
        typeLabel: formatJobType(job.type),
      },
      applications: {
        total: stats?.totalApplications || 0,
        pending: stats?.pendingApplications || 0,
        accepted: stats?.acceptedApplications || 0,
        rejected: stats?.rejectedApplications || 0,
        shortlisted: stats?.shortlistedApplications || 0,
        interviewed: stats?.interviewedApplications || 0,
        list: applications.map((application) => {
          const devId = String(application.developer?._id || "");
          const profile = profileMap.get(devId);

          return {
            applicationId: application._id,
            developerId: application.developer?._id || null,
            developerName: profile?.fullName || "Unknown Developer",
            developerTitle: profile?.title || "",
            profilePicture: profile?.profilePicture?.url || "",
            status: application.status,
            statusLabel: applicationStatusLabelMap[application.status] || application.status,
            submittedAt: application.createdAt,
            actions: {
              view: `/company/developers/${application.developer?._id || ""}/profile`,
              updateStatus: `/company/applications/${application._id}/status`,
            },
          };
        }),
      },
      actions: {
        buildTeamFromApplicants: `/company/jobs/${job._id}/build-team`,
        updateJobStatus: `/company/jobs/${job._id}/status`,
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
    ...(payload.requirements !== undefined && { requirements: payload.requirements }),
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
    ...(payload.experienceLevel !== undefined && {
      experienceLevel: payload.experienceLevel,
    }),
    ...(payload.budget !== undefined && { budget: payload.budget }),
    ...(payload.budgetMin !== undefined && { budgetMin: payload.budgetMin }),
    ...(payload.budgetMax !== undefined && { budgetMax: payload.budgetMax }),
    ...(payload.estimatedDuration !== undefined && {
      estimatedDuration: payload.estimatedDuration,
    }),
    ...(payload.deadline !== undefined && { deadline: payload.deadline }),
    ...(payload.teamSize !== undefined && { teamSize: payload.teamSize }),
    ...(payload.publicationStatus !== undefined && {
      publicationStatus: payload.publicationStatus,
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
      statusLabel: applicationStatusLabelMap[application.status] || application.status,
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
      actions: {
        view: `/company/developers/${application.developer?._id || ""}/profile`,
        updateStatus: `/company/applications/${application._id}/status`,
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

export const buildTeamFromApplicants = asyncHandeler(async (req, res, next) => {
  const roleError = ensureCompanyRole(req, next);
  if (roleError) return;

  const { jobId } = req.params;
  const { applicationIds = [], closeJob = true } = req.body;

  const job = await getOwnedJobOrThrow({ companyId: req.user._id, jobId, next });
  if (!job) return;

  const filter = {
    company: req.user._id,
    job: jobId,
    ...(applicationIds.length ? { _id: { $in: applicationIds } } : { status: { $in: ["shortlisted", "interviewed", "accepted"] } }),
  };

  const selectedApplications = await applicationModel
    .find(filter)
    .populate([{ path: "developer", select: "email" }]);

  if (!selectedApplications.length) {
    return next(new Error("no selected applicants found", { cause: 404 }));
  }

  const selectedIds = selectedApplications.map((application) => application._id);
  await applicationModel.updateMany(
    { _id: { $in: selectedIds }, company: req.user._id, job: jobId },
    { status: "accepted" }
  );

  if (closeJob) {
    await dbService.findOneAndUpdate({
      model: jobModel,
      filter: { _id: jobId, company: req.user._id },
      data: { status: "closed" },
    });
  }

  const developerIds = selectedApplications
    .map((application) => application.developer?._id)
    .filter(Boolean);

  const profiles = await developerModel.find({ user: { $in: developerIds } });
  const profileMap = new Map(profiles.map((profile) => [String(profile.user), profile]));

  const teamMembers = selectedApplications.map((application) => {
    const devId = String(application.developer?._id || "");
    const profile = profileMap.get(devId);

    return {
      applicationId: application._id,
      developerId: application.developer?._id || null,
      name: profile?.fullName || "Unknown Developer",
      title: profile?.title || "",
      email: application.developer?.email || "",
      skills: profile?.skills || [],
      rank: profile?.rank || "Bronze",
      status: "accepted",
    };
  });

  return successResponse({
    res,
    message: "team built from applicants successfully",
    data: {
      job: {
        jobId: job._id,
        title: job.title,
        status: closeJob ? "closed" : job.status,
      },
      teamMembers,
      totalMembers: teamMembers.length,
    },
  });
});

export const getCompanyApplicantsList = asyncHandeler(async (req, res, next) => {
  const roleError = ensureCompanyRole(req, next);
  if (roleError) return;

  const {
    page = 1,
    limit = 10,
    search = "",
    skills = "",
    rank = "",
    experience = "all",
    status = "all",
  } = req.query;

  const pageNumber = Number(page);
  const limitNumber = Number(limit);
  const skip = (pageNumber - 1) * limitNumber;

  const applications = await applicationModel
    .find({ company: req.user._id })
    .sort({ createdAt: -1 })
    .populate([
      { path: "developer", select: "email" },
      { path: "job", select: "title" },
    ]);

  const developerIds = applications.map((item) => item.developer?._id).filter(Boolean);

  const [profiles, ratings] = await Promise.all([
    developerModel.find({ user: { $in: developerIds } }),
    ratingModel.aggregate([
      { $match: { developer: { $in: developerIds } } },
      {
        $group: {
          _id: "$developer",
          average: { $avg: "$overall" },
        },
      },
    ]),
  ]);

  const profileMap = new Map(profiles.map((profile) => [String(profile.user), profile]));
  const ratingMap = new Map(
    ratings.map((item) => [String(item._id), Number((item.average || 0).toFixed(1))])
  );

  const experienceMatches = (profile, experienceFilter) => {
    if (experienceFilter === "all") return true;
    const years = Number(profile?.yearsExperience || 0);
    if (experienceFilter === "junior") return years < 2;
    if (experienceFilter === "mid") return years >= 2 && years <= 5;
    if (experienceFilter === "senior") return years > 5;
    return true;
  };

  const normalizedSearch = String(search || "").trim().toLowerCase();
  const normalizedSkill = String(skills || "").trim().toLowerCase();
  const normalizedRank = String(rank || "").trim().toLowerCase();
  const normalizedStatus = String(status || "all").trim().toLowerCase();

  const statusMapper = {
    new: "pending",
    interviewing: "interviewed",
    pending: "pending",
    shortlisted: "shortlisted",
    interviewed: "interviewed",
    accepted: "accepted",
    rejected: "rejected",
  };

  const allRows = applications.map((application) => {
    const devId = String(application.developer?._id || "");
    const profile = profileMap.get(devId);
    const mappedStatus =
      application.status === "pending"
        ? "new"
        : application.status === "interviewed"
        ? "interviewing"
        : application.status
        ? application.status
        : "rejected";

    return {
      applicationId: application._id,
      rawStatus: application.status,
      status: mappedStatus,
      submittedAt: application.createdAt,
      developer: {
        userId: application.developer?._id || null,
        fullName: profile?.fullName || "Unknown Developer",
        title: profile?.title || "",
        yearsExperience: Number(profile?.yearsExperience || 0),
        rank: profile?.rank || "Bronze",
        rating: ratingMap.get(devId) || 0,
        skills: profile?.skills || [],
        email: application.developer?.email || "",
        cvUrl: profile?.cv?.url || "",
        portfolioUrl: profile?.portfolio?.[0]?.projectUrl || "",
        githubUrl: profile?.githubUrl || "",
      },
      appliedJobTitle: application.job?.title || "",
      actions: {
        scheduleInterview: "/company/interviews",
        viewProfile: `/company/developers/${application.developer?._id || ""}/profile`,
        reject: `/company/applications/${application._id}/status`,
      },
    };
  });

  const filteredRows = allRows.filter((row) => {
    const searchMatch =
      !normalizedSearch ||
      row.developer.fullName.toLowerCase().includes(normalizedSearch) ||
      row.developer.email.toLowerCase().includes(normalizedSearch) ||
      row.appliedJobTitle.toLowerCase().includes(normalizedSearch);

    const skillMatch =
      !normalizedSkill ||
      row.developer.skills.some((skill) => skill.toLowerCase().includes(normalizedSkill));

    const rankMatch =
      !normalizedRank || row.developer.rank.toLowerCase().includes(normalizedRank);

    const experienceMatch = experienceMatches(row.developer, experience);

    const mapped = statusMapper[normalizedStatus];
    const statusMatch = !mapped || row.rawStatus === mapped;

    return searchMatch && skillMatch && rankMatch && experienceMatch && statusMatch;
  });

  const paginatedRows = filteredRows.slice(skip, skip + limitNumber);
  const totalItems = filteredRows.length;
  const totalPages = Math.ceil(totalItems / limitNumber) || 1;
  const showingFrom = totalItems === 0 ? 0 : skip + 1;
  const showingTo = Math.min(skip + paginatedRows.length, totalItems);

  const totalApplicants = allRows.length;
  const newApplicants = allRows.filter((item) => item.rawStatus === "pending").length;
  const interviewingApplicants = allRows.filter(
    (item) => item.rawStatus === "accepted"
  ).length;

  return successResponse({
    res,
    message: "company applicants list fetched successfully",
    data: {
      header: {
        pageTitle: "Applicants List",
        subtitle: "Manage and review candidates for open positions.",
      },
      stats: {
        total: totalApplicants,
        new: newApplicants,
        interviewing: interviewingApplicants,
      },
      filters: {
        search: String(search || ""),
        skills: String(skills || ""),
        rank: String(rank || ""),
        experience: String(experience || "all"),
        status: String(status || "all"),
      },
      applicants: paginatedRows,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        totalItems,
        totalPages,
        showingFrom,
        showingTo,
        summaryText: `Showing ${showingFrom} to ${showingTo} of ${totalItems} applicants`,
      },
    },
  });
});

export const getDeveloperProfileForCompany = asyncHandeler(async (req, res, next) => {
  const roleError = ensureCompanyRole(req, next);
  if (roleError) return;

  const { developerId } = req.params;

  const [profile, ratingSummary, applications] = await Promise.all([
    dbService.findOne({
      model: developerModel,
      filter: { user: developerId },
    }),
    ratingModel.aggregate([
      { $match: { developer: developerId } },
      {
        $group: {
          _id: "$developer",
          averageRating: { $avg: "$overall" },
          totalRatings: { $sum: 1 },
        },
      },
    ]),
    applicationModel
      .find({
        company: req.user._id,
        developer: developerId,
      })
      .populate([{ path: "job", select: "title" }])
      .sort({ createdAt: -1 }),
  ]);

  if (!profile) {
    return next(new Error("developer profile not found", { cause: 404 }));
  }

  const latestApplication = applications[0] || null;
  const averageRating = Number((ratingSummary[0]?.averageRating || 0).toFixed(1));
  const totalRatings = ratingSummary[0]?.totalRatings || 0;

  return successResponse({
    res,
    message: "developer profile fetched successfully",
    data: {
      profile: {
        developerId,
        fullName: profile.fullName,
        title: profile.title || "",
        bio: profile.bio || "",
        profilePicture: profile.profilePicture?.url || "",
        cvUrl: profile.cv?.url || "",
        skills: profile.skills || [],
        specialization: profile.specialization || "",
        experienceLevel: profile.experienceLevel || "",
        yearsExperience: profile.yearsExperience || 0,
        availability: profile.availability || "available",
        rank: profile.rank || "Bronze",
        rankPoints: profile.rankPoints || 0,
        githubUrl: profile.githubUrl || "",
        portfolio: profile.portfolio || [],
        workHistory: profile.workHistory || [],
        averageRating,
        totalRatings,
      },
      applicationContext: latestApplication
        ? {
            applicationId: latestApplication._id,
            appliedJobTitle: latestApplication.job?.title || "",
            status: latestApplication.status,
            proposedBudget: latestApplication.proposedBudget,
            submittedAt: latestApplication.createdAt,
          }
        : null,
      actions: {
        scheduleInterview: "/company/interviews",
        reject: latestApplication
          ? `/company/applications/${latestApplication._id}/status`
          : null,
      },
    },
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

export const updateInterview = asyncHandeler(async (req, res, next) => {
  const roleError = ensureCompanyRole(req, next);
  if (roleError) return;

  const { interviewId } = req.params;
  const { status, feedback, scheduledAt, mode, interviewType } = req.body;

  const interview = await dbService.findOne({
    model: interviewModel,
    filter: { _id: interviewId, company: req.user._id },
  });

  if (!interview) {
    return next(new Error("interview not found", { cause: 404 }));
  }

  const updated = await dbService.findOneAndUpdate({
    model: interviewModel,
    filter: { _id: interviewId, company: req.user._id },
    data: {
      ...(status !== undefined && { status }),
      ...(feedback !== undefined && { feedback }),
      ...(scheduledAt !== undefined && { scheduledAt }),
      ...(mode !== undefined && { mode }),
      ...(interviewType !== undefined && { interviewType }),
    },
  });

  return successResponse({
    res,
    message: "interview updated successfully",
    data: { interview: updated },
  });
});
