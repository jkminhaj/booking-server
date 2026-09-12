import express from "express";
import usersController from "./users.controller.js";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { authorize } from "../../middlewares/authorize.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  listUsersSchema,
  getUserSchema,
  createUserSchema,
  updateUserSchema,
  updateUserRoleSchema,
  updateUserStatusSchema,
  replaceStaffServicesSchema,
} from "./users.validator.js";

const router = express.Router();
router.use(authenticate);

router.get("/", validate(listUsersSchema), usersController.list);
router.get("/:id", validate(getUserSchema), usersController.getById);
router.post("/", authorize("OWNER", "ADMIN", "MANAGER"), validate(createUserSchema), usersController.create);
router.patch("/:id", authorize("OWNER", "ADMIN", "MANAGER"), validate(updateUserSchema), usersController.update);
router.patch(
  "/:id/role",
  authorize("OWNER", "ADMIN"),
  validate(updateUserRoleSchema),
  usersController.updateRole
);
router.patch(
  "/:id/status",
  authorize("OWNER", "ADMIN", "MANAGER"),
  validate(updateUserStatusSchema),
  usersController.updateStatus
);
router.delete("/:id", authorize("OWNER", "ADMIN"), validate(getUserSchema), usersController.remove);

router.get("/:id/services", validate(getUserSchema), usersController.getServices);
router.put(
  "/:id/services",
  authorize("OWNER", "ADMIN", "MANAGER"),
  validate(replaceStaffServicesSchema),
  usersController.replaceServices
);

export default router;
