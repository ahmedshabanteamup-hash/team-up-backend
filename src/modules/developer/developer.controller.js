import { Router } from "express";
import { authentication } from "../../middelware/authentication.middelware.js";
import { validation } from "../../middelware/validation.middelware.js";
import { localFileUpload } from "../../utils/multer/local.maulter.js";
import * as developerservice from "./developer.service.js";
import * as validators from "./developer.validation.js";

const router = Router();

router.get("/profile", authentication(), developerservice.getMyProfile);
router.get("/dashboard", authentication(), developerservice.getDeveloperDashboard);
router.get("/work-history", authentication(), developerservice.getWorkHistory);
router.get("/rank-progress", authentication(), developerservice.getRankProgress);
router.get("/applications", authentication(), developerservice.getMyApplications);
router.get("/recommended-jobs", authentication(), developerservice.getRecommendedJobs);
router.get(
  "/projects",
  authentication(),
  validation(validators.browseDeveloperProjects),
  developerservice.browseDeveloperProjects
);
router.get(
  "/browse-projects",
  authentication(),
  validation(validators.browseDeveloperProjects),
  developerservice.browseDeveloperProjects
);
router.get(
  "/jobs",
  authentication(),
  validation(validators.browseDeveloperProjects),
  developerservice.browseDeveloperProjects
);
router.get("/skill-quiz/tracks", authentication(), developerservice.getSkillQuizTracks);
router.get("/skill-quiz/current", authentication(), developerservice.getCurrentSkillQuizAttempt);

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
  "/profile-image",
  authentication(),
  localFileUpload().single("image"),
  developerservice.uploadDeveloperProfileImage
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

router.post(
  "/skill-quiz/start",
  authentication(),
  validation(validators.startSkillQuiz),
  developerservice.startSkillQuiz
);

router.patch(
  "/skill-quiz/:attemptId/answer",
  authentication(),
  validation(validators.answerSkillQuizQuestion),
  developerservice.answerSkillQuizQuestion
);

router.post(
  "/skill-quiz/:attemptId/submit",
  authentication(),
  validation(validators.submitSkillQuiz),
  developerservice.submitSkillQuiz
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
