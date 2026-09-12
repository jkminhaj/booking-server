import express from "express";
import controller from "./appointments.controller.js";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { authorize } from "../../middlewares/authorize.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  listAppointmentsSchema,
  getAppointmentSchema,
  getByDateSchema,
  getByStaffSchema,
  getByCustomerSchema,
  createAppointmentSchema,
  updateAppointmentSchema,
  updateStatusSchema,
  cancelAppointmentSchema,
} from "./appointments.validator.js";

const router = express.Router();
router.use(authenticate);

// Front-desk-and-up manage bookings. STAFF gets read-only access to their
// own schedule (enforced in the controller) — extend this if you want
// stylists to confirm/complete their own appointments directly.
const canManage = authorize("OWNER", "ADMIN", "MANAGER", "RECEPTIONIST");

router.get("/date/:date", validate(getByDateSchema), controller.getByDate);
router.get("/staff/:staffId", validate(getByStaffSchema), controller.getByStaff);
router.get("/customer/:customerId", validate(getByCustomerSchema), controller.getByCustomer);

router.get("/", validate(listAppointmentsSchema), controller.list);
router.get("/:id", validate(getAppointmentSchema), controller.getById);
router.get("/:id/payment", validate(getAppointmentSchema), controller.getPayments);

router.post("/", canManage, validate(createAppointmentSchema), controller.create);
router.patch("/:id", canManage, validate(updateAppointmentSchema), controller.update);
router.patch("/:id/status", canManage, validate(updateStatusSchema), controller.updateStatus);

router.post("/:id/cancel", canManage, validate(cancelAppointmentSchema), controller.cancel);
router.post("/:id/confirm", canManage, validate(getAppointmentSchema), controller.confirm);
router.post("/:id/complete", canManage, validate(getAppointmentSchema), controller.complete);
router.post("/:id/no-show", canManage, validate(getAppointmentSchema), controller.noShow);

router.delete("/:id", canManage, validate(getAppointmentSchema), controller.remove);

export default router;
