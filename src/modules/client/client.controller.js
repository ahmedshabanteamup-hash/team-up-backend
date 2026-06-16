
import { Router } from "express";
import { authentication } from "../../middelware/authentication.middelware.js";
import { validation } from "../../middelware/validation.middelware.js";
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


export default router;
