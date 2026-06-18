
import { Router } from "express";
import { authentication } from "../../middelware/authentication.middelware.js";
import { validation } from "../../middelware/validation.middelware.js";
import * as clientService from "./client.service.js";
import * as validators from "./client.validation.js";
import * as projectService from "../projects/project.service.js";
import * as projectValidators from "../projects/project.validation.js";
import * as companyService from "../companyProfile/company.service.js";
import * as companyValidators from "../companyProfile/company.validation.js";

const router = Router();

router.post(
  "/create-profile",
  authentication(),
  validation(validators.createClientProfile),
  clientService.createClientProfile
);
///////////////////////////////////////////////////22222222222222222222
router.get(
  "/profile",
  authentication(),
  clientService.getMyClientProfile
);

router.get(
  "/my-profile",
  authentication(),                 // لازم عشان req.user
  clientService.getMyClientProfile  // اللوجيك كله جوه السيرفس
);

//////////////////////////////////////333333333333333333333333333333333
router.patch(
  "/update-profile",
  authentication(),
  validation(validators.updateClientProfile),
  clientService.updateClientProfile
);

router.get(
  "/account-summary",
  authentication(),
  clientService.getClientAccountSummary
);

router.get(
  "/job/:jobId",
  authentication(),
  validation(projectValidators.jobIdParam),
  projectService.getMyJobPostDetails
);

router.get(
  "/jobs/my-posts/:jobId",
  authentication(),
  validation(projectValidators.jobIdParam),
  projectService.getMyJobPostDetails
);

router.get(
  "/team-builder/developers",
  authentication(),
  validation(companyValidators.getBuildTeamDevelopersSchema),
  companyService.getBuildTeamDevelopers
);

router.post(
  "/team-builder/confirm",
  authentication(),
  validation(companyValidators.confirmManualTeamSchema),
  companyService.confirmManualTeam
);

router.get(
  "/developers/:developerId/profile",
  authentication(),
  validation(companyValidators.developerIdParamSchema),
  companyService.getDeveloperProfileForCompany
);


export default router;
