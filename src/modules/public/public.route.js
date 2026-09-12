import express from "express";
import controller from "./public.controller.js";
import { resolveBusinessBySlug } from "../../middlewares/tenant.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { publicBookingLimiter } from "../../middlewares/rateLimiters.js";
import {
  businessOnlySchema,
  getServicesSchema,
  getStaffSchema,
  getAvailabilitySchema,
  createAppointmentSchema,
} from "./public.validator.js";

// Entirely unauthenticated — this is the customer-facing booking flow.
// Every route resolves :slug -> req.business via resolveBusinessBySlug,
// so nothing here ever trusts a businessId supplied by the client.
const router = express.Router({ mergeParams: true });

router.get("/business/:slug", validate(businessOnlySchema), resolveBusinessBySlug, controller.getBusiness);
router.get(
  "/business/:slug/categories",
  validate(businessOnlySchema),
  resolveBusinessBySlug,
  controller.getCategories
);
router.get(
  "/business/:slug/services",
  validate(getServicesSchema),
  resolveBusinessBySlug,
  controller.getServices
);
router.get("/business/:slug/staff", validate(getStaffSchema), resolveBusinessBySlug, controller.getStaff);
router.get(
  "/business/:slug/availability",
  validate(getAvailabilitySchema),
  resolveBusinessBySlug,
  controller.getAvailability
);
router.post(
  "/business/:slug/appointments",
  publicBookingLimiter,
  validate(createAppointmentSchema),
  resolveBusinessBySlug,
  controller.createAppointment
);

export default router;
