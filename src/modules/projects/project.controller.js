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

export default router;
