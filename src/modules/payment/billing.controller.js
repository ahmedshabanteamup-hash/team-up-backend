import { Router } from "express";
import * as validators from "./billing.validation.js";
import * as billingService from "./billing.service.js";
import { authentication } from "../../middelware/authentication.middelware.js";
import { validation } from "../../middelware/validation.middelware.js";

const router = Router();

router.post(
  "/payment-method",
  authentication(),
  validation(validators.addPaymentMethod),
  billingService.addPaymentMethod
);
router.delete(
  "/payment-method/:paymentMethodId",
  authentication(),
  billingService.removePaymentMethod
);
router.get(
  "/payment-methods",
  authentication(),
  billingService.getPaymentMethods
);

router.get(
  "/history",
  authentication(),
  billingService.getBillingHistory
);


export default router;

