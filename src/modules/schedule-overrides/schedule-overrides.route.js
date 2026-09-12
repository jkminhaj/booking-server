import express from "express";
import controller from "./schedule-overrides.controller.js";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { authorize } from "../../middlewares/authorize.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  listOverridesSchema,
  getOverridesByDateSchema,
  getOverrideSchema,
  createOverrideSchema,
  updateOverrideSchema,
} from "./schedule-overrides.validator.js";

const router = express.Router();
router.use(authenticate);

const canManage = authorize("OWNER", "ADMIN", "MANAGER");

router.get("/date/:date", validate(getOverridesByDateSchema), controller.getByDate);
router.get("/", validate(listOverridesSchema), controller.list);
router.get("/:id", validate(getOverrideSchema), controller.getById);

router.post("/", canManage, validate(createOverrideSchema), controller.create);
router.patch("/:id", canManage, validate(updateOverrideSchema), controller.update);
router.delete("/:id", canManage, validate(getOverrideSchema), controller.remove);

export default router;
