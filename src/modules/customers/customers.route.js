import express from "express";
import customersController from "./customers.controller.js";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { authorize } from "../../middlewares/authorize.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  listCustomersSchema,
  searchCustomersSchema,
  getCustomerSchema,
  createCustomerSchema,
  updateCustomerSchema,
  getCustomerAppointmentsSchema,
} from "./customers.validator.js";

const router = express.Router();
router.use(authenticate);

const canManage = authorize("OWNER", "ADMIN", "MANAGER", "RECEPTIONIST");

// /search must come before /:id — otherwise Express would treat "search" as an :id value.
router.get("/search", validate(searchCustomersSchema), customersController.search);

router.get("/", validate(listCustomersSchema), customersController.list);
router.get("/:id", validate(getCustomerSchema), customersController.getById);
router.get("/:id/appointments", validate(getCustomerAppointmentsSchema), customersController.getAppointments);

router.post("/", canManage, validate(createCustomerSchema), customersController.create);
router.patch("/:id", canManage, validate(updateCustomerSchema), customersController.update);
router.delete("/:id", canManage, validate(getCustomerSchema), customersController.remove);

export default router;
