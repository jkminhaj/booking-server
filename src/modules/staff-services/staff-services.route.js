import express from "express";
import staffServicesController from "./staff-services.controller.js";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { authorize } from "../../middlewares/authorize.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  listStaffServicesSchema,
  getStaffServiceSchema,
  createStaffServiceSchema,
  updateStaffServiceSchema,
} from "./staff-services.validator.js";

const router = express.Router();
router.use(authenticate);

const canManage = authorize("OWNER", "ADMIN", "MANAGER");

router.get("/", validate(listStaffServicesSchema), staffServicesController.list);
router.get("/:id", validate(getStaffServiceSchema), staffServicesController.getById);
router.post("/", canManage, validate(createStaffServiceSchema), staffServicesController.create);
router.patch("/:id", canManage, validate(updateStaffServiceSchema), staffServicesController.update);
router.delete("/:id", canManage, validate(getStaffServiceSchema), staffServicesController.remove);

export default router;
