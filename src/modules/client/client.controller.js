
import { Router } from "express";
import { authentication } from "../../middleware/authentication.middleware.js";
import { validation } from "../../middleware/validation.middleware.js";
import * as clientService from "./client.service.js";
import * as validators from "./client.validation.js";

const router = Router();

router.post(
  "/create-profile",
  authentication(),
  validation(validators.createClientProfile),
  clientService.createClientProfile
);
///////////////////////////////////////////////////22222222222222222222
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


export default router;
