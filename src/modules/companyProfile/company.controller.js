import { Router } from "express";
import { authentication } from "../../middelware/authentication.middelware.js";
import { validation } from "../../middelware/validation.middelware.js";
import { localFileUpload } from "../../utils/multer/local.maulter.js";
import * as companyService from "./company.service.js";
import * as validators from "./company.validation.js";

const router = Router();

router.get(
  "/my-dashboard",
  authentication(),
  companyService.getMyCompanyDashboard
);

router.patch(
  "/update-profile",
  authentication(),
  validation(validators.updateCompanyProfileSchema),
  companyService.updateMyCompanyProfile
);

router.patch(
  "/update-logo",
  authentication(),
  localFileUpload().single("image"),
  companyService.updateCompanyLogo
);

router.patch(
  "/update-about",
  authentication(),
  validation(validators.updateCompanyAboutSchema),
  companyService.updateCompanyAbout
);

router.post(
  "/jobs",
  authentication(),
  validation(validators.createJobSchema),
  companyService.createJob
);

router.get(
  "/jobs/my-posts",
  authentication(),
  validation(validators.getMyJobPostsSchema),
  companyService.getMyJobPosts
);

router.get(
  "/jobs/:jobId",
  authentication(),
  validation(validators.jobIdParamSchema),
  companyService.getMyJobDetails
);

router.patch(
  "/jobs/:jobId",
  authentication(),
  validation(validators.updateJobSchema),
  companyService.updateMyJob
);

router.delete(
  "/jobs/:jobId",
  authentication(),
  validation(validators.jobIdParamSchema),
  companyService.deleteMyJob
);

router.patch(
  "/jobs/:jobId/status",
  authentication(),
  validation(validators.updateJobStatusSchema),
  companyService.updateJobStatus
);

router.get(
  "/jobs/:jobId/applicants",
  authentication(),
  validation(validators.getApplicantsSchema),
  companyService.getJobApplicants
);

router.post(
  "/jobs/:jobId/build-team",
  authentication(),
  validation(validators.buildTeamFromApplicantsSchema),
  companyService.buildTeamFromApplicants
);

router.get(
  "/team-builder/developers",
  authentication(),
  validation(validators.getBuildTeamDevelopersSchema),
  companyService.getBuildTeamDevelopers
);

router.post(
  "/team-builder/confirm",
  authentication(),
  validation(validators.confirmManualTeamSchema),
  companyService.confirmManualTeam
);

router.get(
  "/applicants",
  authentication(),
  validation(validators.getCompanyApplicantsListSchema),
  companyService.getCompanyApplicantsList
);

router.get(
  "/developers/:developerId/profile",
  authentication(),
  validation(validators.developerIdParamSchema),
  companyService.getDeveloperProfileForCompany
);

router.patch(
  "/applications/:applicationId/status",
  authentication(),
  validation(validators.updateApplicationStatusSchema),
  companyService.updateApplicationStatus
);

router.get(
  "/interviews",
  authentication(),
  companyService.getMyInterviews
);

router.get(
  "/interviews/upcoming",
  authentication(),
  companyService.getUpcomingInterviews
);

router.get(
  "/interviews/past",
  authentication(),
  companyService.getPastInterviews
);

router.get(
  "/interviews/schedule-form",
  authentication(),
  companyService.getScheduleInterviewForm
);

router.get(
  "/interviews/:interviewId",
  authentication(),
  validation(validators.interviewIdParamSchema),
  companyService.getInterviewDetails
);

router.post(
  "/interviews",
  authentication(),
  validation(validators.createInterviewSchema),
  companyService.createInterview
);

router.patch(
  "/interviews/:interviewId",
  authentication(),
  validation(validators.updateInterviewSchema),
  companyService.updateInterview
);

export default router;
