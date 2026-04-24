import { Router } from "express";
import * as projectService from "./project.service.js";
import * as validators from "./project.validation.js";
import { authentication } from "../../middelware/authentication.middelware.js";
import { validation } from "../../middelware/validation.middelware.js";

const router = Router();

router.post(
  "/",
  authentication(),
  validation(validators.createProject),
  projectService.createProject
);

router.get(
  "/:projectId/details",
  authentication(),
  validation(validators.projectIdParam),
  projectService.getProjectDetailsForDeveloper
);

router.get(
  "/:projectId/leader-dashboard",
  authentication(),
  validation(validators.projectIdParam),
  projectService.getLeaderDashboard
);

router.get(
  "/:projectId/team-members/:memberUserId/profile",
  authentication(),
  validation(validators.teamMemberProfileParam),
  projectService.getTeamMemberProfile
);

router.post(
  "/:projectId/team-members",
  authentication(),
  validation(validators.addTeamMember),
  projectService.addTeamMember
);

router.post(
  "/:projectId/tasks",
  authentication(),
  validation(validators.addTask),
  projectService.addTask
);

router.patch(
  "/:projectId/tasks/:taskId/status",
  authentication(),
  validation(validators.updateTaskStatus),
  projectService.updateTaskStatus
);

router.patch(
  "/:projectId/tasks/:taskId/reassign",
  authentication(),
  validation(validators.reassignTask),
  projectService.reassignTask
);

router.get(
  "/:projectId/evaluations",
  authentication(),
  validation(validators.projectIdParam),
  projectService.getProjectEvaluations
);

router.post(
  "/:projectId/evaluations",
  authentication(),
  validation(validators.addProjectEvaluation),
  projectService.addProjectEvaluation
);

router.get(
  "/:projectId/activities",
  authentication(),
  validation(validators.projectIdParam),
  projectService.getProjectActivities
);

router.get(
  "/:projectId/chat/messages",
  authentication(),
  validation(validators.projectIdParam),
  projectService.getProjectChatMessages
);

router.post(
  "/:projectId/chat/messages",
  authentication(),
  validation(validators.addProjectMessage),
  projectService.addProjectChatMessage
);

router.get(
  "/:projectId/resources",
  authentication(),
  validation(validators.projectIdParam),
  projectService.getProjectResources
);

router.post(
  "/:projectId/resources",
  authentication(),
  validation(validators.addProjectResource),
  projectService.addProjectResource
);

router.post(
  "/:projectId/ai-assistant/ask",
  authentication(),
  validation(validators.askProjectAssistant),
  projectService.askProjectAssistant
);

router.post(
  "/jobs/preview",
  authentication(),
  validation(validators.previewJobPost),
  projectService.previewClientJobPost
);

router.post(
  "/jobs/publish",
  authentication(),
  validation(validators.previewJobPost),
  projectService.publishClientJobPost
);

export default router;
