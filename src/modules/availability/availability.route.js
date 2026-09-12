import express from "express";
import controller from "./availability.controller.js";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  getAvailabilitySchema,
  getStaffAvailabilitySchema,
  getServiceAvailabilitySchema,
} from "./availability.validator.js";

// Dashboard-side availability lookups (staff checking their own day, admins
// checking capacity). The public customer-facing booking page uses the same
// underlying availabilityService via the `public` module instead of this
// router, since it has no JWT to authenticate with.
const router = express.Router();
router.use(authenticate);

router.get("/", validate(getAvailabilitySchema), controller.get);
router.get("/staff/:staffId", validate(getStaffAvailabilitySchema), controller.getForStaff);
router.get("/service/:serviceId", validate(getServiceAvailabilitySchema), controller.getForService);

export default router;
