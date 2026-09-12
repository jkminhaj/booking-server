import express from "express";
import categoriesController from "./service-categories.controller.js";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { authorize } from "../../middlewares/authorize.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  listCategoriesSchema,
  getCategorySchema,
  createCategorySchema,
  updateCategorySchema,
  updateCategoryStatusSchema,
} from "./service-categories.validator.js";

const router = express.Router();
router.use(authenticate);

const canManage = authorize("OWNER", "ADMIN", "MANAGER");

router.get("/", validate(listCategoriesSchema), categoriesController.list);
router.get("/:id", validate(getCategorySchema), categoriesController.getById);
router.get("/:id/services", validate(getCategorySchema), categoriesController.getServices);

router.post("/", canManage, validate(createCategorySchema), categoriesController.create);
router.patch("/:id", canManage, validate(updateCategorySchema), categoriesController.update);
router.patch(
  "/:id/status",
  canManage,
  validate(updateCategoryStatusSchema),
  categoriesController.updateStatus
);
router.delete("/:id", canManage, validate(getCategorySchema), categoriesController.remove);

export default router;
