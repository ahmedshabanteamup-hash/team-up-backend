import { Router } from "express";
import { authentication } from "../../middelware/authentication.middelware.js";
import { validation } from "../../middelware/validation.middelware.js";
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

router.post(
  "/interviews",
  authentication(),
  validation(validators.createInterviewSchema),
  companyService.createInterview
);

export default router;
