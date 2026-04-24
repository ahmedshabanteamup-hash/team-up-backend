import { Router } from "express";
import { validation } from "../../middelware/validation.middelware.js";
import { authentication } from "../../middelware/authentication.middelware.js";
import * as aiService from "./ai.service.js";
import * as validators from "./ai.validation.js";

const router = Router();

router.get(
  "/team-builder/candidates",
  validation(validators.candidatesQuerySchema),
  aiService.getTeamCandidates
);

router.post(
  "/team-builder/recommend",
  validation(validators.recommendTeamSchema),
  aiService.recommendTeam
);

router.post(
  "/team-builder/recommend-from-job/:jobId",
  authentication(),
  validation(validators.recommendFromJobSchema),
  aiService.recommendTeamFromJob
);

export default router;

