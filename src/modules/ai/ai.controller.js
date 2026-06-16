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

router.get(
  "/team-builder/sessions/:sessionId",
  authentication(),
  validation(validators.sessionIdParamSchema),
  aiService.getTeamBuilderSession
);

router.get(
  "/team-builder/sessions/:sessionId/page",
  authentication(),
  validation(validators.sessionPageQuerySchema),
  aiService.getAutoSuggestTeamPage
);

router.post(
  "/team-builder/recommend",
  authentication(),
  validation(validators.recommendTeamSchema),
  aiService.recommendTeam
);

router.post(
  "/team-builder/recommend-from-job/:jobId",
  authentication(),
  validation(validators.recommendFromJobSchema),
  aiService.recommendTeamFromJob
);

router.post(
  "/team-builder/sessions/:sessionId/regenerate",
  authentication(),
  validation(validators.sessionIdParamSchema),
  aiService.regenerateTeamBuilderSession
);

router.patch(
  "/team-builder/sessions/:sessionId/members/:developerId/accept",
  authentication(),
  validation(validators.sessionMemberParamSchema),
  aiService.acceptSuggestedMember
);

router.post(
  "/team-builder/sessions/:sessionId/members/:developerId/replace",
  authentication(),
  validation(validators.replaceSuggestedMemberSchema),
  aiService.replaceSuggestedMember
);

router.post(
  "/team-builder/sessions/:sessionId/finalize",
  authentication(),
  validation(validators.sessionIdParamSchema),
  aiService.finalizeSuggestedTeam
);

router.patch(
  "/team-builder/sessions/:sessionId/reject",
  authentication(),
  validation(validators.sessionIdParamSchema),
  aiService.rejectSuggestedTeam
);

export default router;
