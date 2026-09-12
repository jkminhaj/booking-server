import express from "express";
import businessController from "./business.controller.js";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { authorize } from "../../middlewares/authorize.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { updateBusinessSchema, updateBusinessStatusSchema } from "./business.validator.js";

// Note: the public "get business by slug" endpoint lives at
// GET /api/public/business/:slug (see the public module) rather than
// duplicating it here as /api/business/public/:slug — one canonical place
// for anonymous business lookups is easier to keep consistent.

const router = express.Router();
router.use(authenticate);

router.get("/", businessController.getCurrent);
router.patch("/", authorize("OWNER", "ADMIN"), validate(updateBusinessSchema), businessController.update);
router.patch(
  "/status",
  authorize("OWNER"),
  validate(updateBusinessStatusSchema),
  businessController.updateStatus
);

export default router;
