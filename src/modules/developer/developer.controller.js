import { Router } from "express";
import { authentication } from "../../middelware/authentication.middelware.js";
import { validation } from "../../middelware/validation.middelware.js";
import * as developerservice from "./developer.service.js";
import * as validators from "./developer.validation.js";

const router = Router();

router.get("/profile", authentication(), developerservice.getMyProfile);
router.get("/dashboard", authentication(), developerservice.getDeveloperDashboard);
router.get("/work-history", authentication(), developerservice.getWorkHistory);
router.get("/rank-progress", authentication(), developerservice.getRankProgress);
router.get("/applications", authentication(), developerservice.getMyApplications);
router.get("/recommended-jobs", authentication(), developerservice.getRecommendedJobs);

router.post(
  "/profile",
  authentication(),
  validation(validators.createDeveloperProfile),
  developerservice.createDeveloperProfile
);

router.patch(
  "/profile",
  authentication(),
  validation(validators.updateDeveloperProfile),
  developerservice.updateDeveloperProfile
);

router.patch(
  "/skills",
  authentication(),
  validation(validators.replaceSkills),
  developerservice.updateDeveloperSkills
);

router.post(
  "/skills",
  authentication(),
  validation(validators.addSkill),
  developerservice.addSkill
);

router.delete(
  "/skills/:skill",
  authentication(),
  validation(validators.removeSkill),
  developerservice.removeSkill
);

router.post(
  "/portfolio",
  authentication(),
  validation(validators.addPortfolioItem),
  developerservice.addPortfolioItem
);

router.patch(
  "/portfolio/:itemId",
  authentication(),
  validation(validators.updatePortfolioItem),
  developerservice.updatePortfolioItem
);

router.delete(
  "/portfolio/:itemId",
  authentication(),
  validation(validators.deletePortfolioItem),
  developerservice.deletePortfolioItem
);

router.post(
  "/work-history",
  authentication(),
  validation(validators.addWorkHistoryItem),
  developerservice.addWorkHistoryItem
);

router.post(
  "/jobs/:jobId/apply",
  authentication(),
  validation(validators.applyToJob),
  developerservice.applyToJob
);

router.patch(
  "/availability",
  authentication(),
  validation(validators.updateAvailability),
  developerservice.updateAvailabilitySettings
);

router.patch(
  "/security/change-password",
  authentication(),
  validation(validators.changePassword),
  developerservice.changeDeveloperPassword
);

export default router;
