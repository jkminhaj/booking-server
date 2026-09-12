import express from "express";
import authController from "./auth.controller.js";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { loginLimiter, registerLimiter } from "../../middlewares/rateLimiters.js";
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
} from "./auth.validator.js";

const router = express.Router();

router.post("/register", registerLimiter, validate(registerSchema), authController.register);
router.post("/login", loginLimiter, validate(loginSchema), authController.login);
// refresh/logout read the httpOnly refresh cookie directly — no access token required,
// since the whole point of /refresh is to recover from an expired access token.
router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);

router.get("/me", authenticate, authController.me);
router.patch("/profile", authenticate, validate(updateProfileSchema), authController.updateProfile);
router.patch(
  "/password",
  authenticate,
  validate(changePasswordSchema),
  authController.changePassword
);

export default router;
