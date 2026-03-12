import { Router } from "express";
import * as landingService from "./landing.service.js";

const router = Router();

router.get("/stats", landingService.getLandingStats);

export default router;
