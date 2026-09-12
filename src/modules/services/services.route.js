import express from "express";
import servicesController from "./services.controller.js";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { authorize } from "../../middlewares/authorize.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  listServicesSchema,
  getServiceSchema,
  createServiceSchema,
  updateServiceSchema,
  updateServiceStatusSchema,
  replaceServiceStaffSchema,
} from "./services.validator.js";

const router = express.Router();
router.use(authenticate);

const canManage = authorize("OWNER", "ADMIN", "MANAGER");

router.get("/", validate(listServicesSchema), servicesController.list);
router.get("/:id", validate(getServiceSchema), servicesController.getById);
router.get("/:id/staff", validate(getServiceSchema), servicesController.getStaff);

router.post("/", canManage, validate(createServiceSchema), servicesController.create);
router.patch("/:id", canManage, validate(updateServiceSchema), servicesController.update);
router.patch(
  "/:id/status",
  canManage,
  validate(updateServiceStatusSchema),
  servicesController.updateStatus
);
router.put("/:id/staff", canManage, validate(replaceServiceStaffSchema), servicesController.replaceStaff);
router.delete("/:id", canManage, validate(getServiceSchema), servicesController.remove);

export default router;
