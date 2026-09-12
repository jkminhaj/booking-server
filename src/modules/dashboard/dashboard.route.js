import express from "express";
import controller from "./dashboard.controller.js";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { authorize } from "../../middlewares/authorize.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { dateRangeQuerySchema } from "./dashboard.validator.js";

const router = express.Router();
// Business insights are manager-and-up territory across this whole module.
router.use(authenticate, authorize("OWNER", "ADMIN", "MANAGER"));

router.get("/overview", controller.overview);
router.get("/today", controller.today);
router.get("/revenue", validate(dateRangeQuerySchema), controller.revenue);
router.get("/appointments", validate(dateRangeQuerySchema), controller.appointments);
router.get("/customers", controller.customers);
router.get("/services", controller.services);
router.get("/staff", controller.staff);

export default router;
