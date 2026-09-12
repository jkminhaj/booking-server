import express from "express";
import controller from "./working-hours.controller.js";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { authorize } from "../../middlewares/authorize.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  getStaffWorkingHoursSchema,
  createWorkingHoursSchema,
  updateWorkingHoursSchema,
  getWorkingHoursSchema,
  replaceStaffWeekSchema,
} from "./working-hours.validator.js";

const router = express.Router();
router.use(authenticate);

const canManage = authorize("OWNER", "ADMIN", "MANAGER");

router.get("/", controller.listBusinessHours);
router.get("/staff/:staffId", validate(getStaffWorkingHoursSchema), controller.getForStaff);
router.put(
  "/staff/:staffId",
  canManage,
  validate(replaceStaffWeekSchema),
  controller.replaceStaffWeek
);

router.post("/", canManage, validate(createWorkingHoursSchema), controller.create);
router.patch("/:id", canManage, validate(updateWorkingHoursSchema), controller.update);
router.delete("/:id", canManage, validate(getWorkingHoursSchema), controller.remove);

export default router;
