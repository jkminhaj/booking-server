import express from "express";
import controller from "./payments.controller.js";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { authorize } from "../../middlewares/authorize.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { publicBookingLimiter } from "../../middlewares/rateLimiters.js";
import {
  listPaymentsSchema,
  getPaymentSchema,
  getByAppointmentSchema,
  createPaymentSchema,
  updatePaymentSchema,
  refundPaymentSchema,
  createIntentSchema,
} from "./payments.validator.js";

// NOTE: POST /api/payments/webhook is NOT defined here — it's registered
// directly in app.js, ahead of the global JSON body parser, because Stripe
// signature verification needs the raw request body. See app.js.

const router = express.Router();

// Public: the customer pays from the booking page and has no staff account.
router.post("/create-intent", publicBookingLimiter, validate(createIntentSchema), controller.createIntent);

router.use(authenticate);
const canManage = authorize("OWNER", "ADMIN", "MANAGER", "RECEPTIONIST");

router.get("/", canManage, validate(listPaymentsSchema), controller.list);
router.get("/:id", canManage, validate(getPaymentSchema), controller.getById);
router.get(
  "/appointment/:appointmentId",
  canManage,
  validate(getByAppointmentSchema),
  controller.getByAppointment
);
router.post("/", canManage, validate(createPaymentSchema), controller.create);
router.patch("/:id", canManage, validate(updatePaymentSchema), controller.update);
router.post(
  "/:id/refund",
  authorize("OWNER", "ADMIN", "MANAGER"),
  validate(refundPaymentSchema),
  controller.refund
);

export default router;
