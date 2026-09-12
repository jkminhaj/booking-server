import express from "express";
import controller from "./blocked-times.controller.js";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { authorize } from "../../middlewares/authorize.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  listBlockedTimesSchema,
  getStaffBlockedTimesSchema,
  getBlockedTimeSchema,
  createBlockedTimeSchema,
  updateBlockedTimeSchema,
} from "./blocked-times.validator.js";

const router = express.Router();
router.use(authenticate);

const canManage = authorize("OWNER", "ADMIN", "MANAGER");

router.get("/staff/:staffId", validate(getStaffBlockedTimesSchema), controller.getForStaff);
router.get("/", validate(listBlockedTimesSchema), controller.list);
router.get("/:id", validate(getBlockedTimeSchema), controller.getById);

router.post("/", canManage, validate(createBlockedTimeSchema), controller.create);
router.patch("/:id", canManage, validate(updateBlockedTimeSchema), controller.update);
router.delete("/:id", canManage, validate(getBlockedTimeSchema), controller.remove);

export default router;
