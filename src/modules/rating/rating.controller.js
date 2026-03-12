import { Router } from "express";
import * as ratingService from "./rating.service.js";
import * as ratingValidation from "./rating.validation.js";
import { authentication } from "../../middelware/authentication.middelware.js";
import { validation } from "../../middelware/validation.middelware.js";

const router = Router();


router.post(
  "/client",
  authentication(),
  validation(ratingValidation.rateClientSchema),
  ratingService.rateClient
);

router.get(
  "/client_rating",
  authentication(),
  ratingService.getClientRatingSummary
);


export default router;
