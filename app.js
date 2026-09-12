import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import morgan from "morgan";

import swaggerUi from "swagger-ui-express";
import { load as loadYaml } from "js-yaml";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { env, isProduction } from "./src/config/env.js";
import prisma from "./src/config/prisma.js";
import { generalLimiter } from "./src/middlewares/rateLimiters.js";
import { notFoundHandler, errorHandler } from "./src/middlewares/error.middleware.js";

import paymentsController from "./src/modules/payments/payments.controller.js";
import authRouter from "./src/modules/auth/auth.route.js";
import businessRouter from "./src/modules/business/business.route.js";
import usersRouter from "./src/modules/users/users.route.js";
import customersRouter from "./src/modules/customers/customers.route.js";
import serviceCategoriesRouter from "./src/modules/service-categories/service-categories.route.js";
import servicesRouter from "./src/modules/services/services.route.js";
import staffServicesRouter from "./src/modules/staff-services/staff-services.route.js";
import workingHoursRouter from "./src/modules/working-hours/working-hours.route.js";
import scheduleOverridesRouter from "./src/modules/schedule-overrides/schedule-overrides.route.js";
import blockedTimesRouter from "./src/modules/blocked-times/blocked-times.route.js";
import availabilityRouter from "./src/modules/availability/availability.route.js";
import appointmentsRouter from "./src/modules/appointments/appointments.route.js";
import publicRouter from "./src/modules/public/public.route.js";
import paymentsRouter from "./src/modules/payments/payments.route.js";
import dashboardRouter from "./src/modules/dashboard/dashboard.route.js";

const app = express();

// Common to sit behind a proxy (Render, Railway, Fly, nginx, ...) — trust
// the first hop so req.ip / rate limiting see the real client IP.
app.set("trust proxy", 1);

// --- Stripe webhook: MUST be registered before express.json() below. ---
// Signature verification needs the exact raw request bytes; once
// express.json() has parsed the body into an object those bytes are gone
// and verification will always fail. Every other route gets JSON parsing;
// this one intentionally does not.
app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  // Express 5 forwards a rejected promise to the error handler automatically
  // for route handlers, but this is a plain function passed to app.post
  // (not going through a Router), so we forward manually to be explicit.
  (req, res, next) => paymentsController.handleWebhook(req, res).catch(next)
);

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN.split(",").map((origin) => origin.trim()), credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(morgan(isProduction ? "combined" : "dev"));
app.use("/api", generalLimiter);

app.get("/", (req, res) => {
  res.json({ success: true, data: { message: "Booking SaaS API is running.", health: "/api/health" } });
});

app.get("/api/health", async (req, res) => {
  let databaseStatus = "ok";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    databaseStatus = "error";
  }

  const status = databaseStatus === "ok" ? "ok" : "error";
  res.status(status === "ok" ? 200 : 503).json({
    success: status === "ok",
    data: { status, database: databaseStatus, environment: env.NODE_ENV, timestamp: new Date().toISOString() },
  });
});

// --- API docs ---
// /api/docs         interactive Swagger UI
// /api/openapi.json the same spec as JSON (Postman: Import -> Link)
// /api/openapi.yaml the raw spec file (client/SDK generators, spec linters)
const openapiPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "docs", "openapi.yaml");
const openapiDocument = loadYaml(fs.readFileSync(openapiPath, "utf8"));

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openapiDocument));
app.get("/api/openapi.json", (req, res) => res.json(openapiDocument));
app.get("/api/openapi.yaml", (req, res) => res.type("text/yaml").sendFile(openapiPath));

app.use("/api/auth", authRouter);
app.use("/api/business", businessRouter);
app.use("/api/users", usersRouter);
app.use("/api/customers", customersRouter);
app.use("/api/service-categories", serviceCategoriesRouter);
app.use("/api/services", servicesRouter);
app.use("/api/staff-services", staffServicesRouter);
app.use("/api/working-hours", workingHoursRouter);
app.use("/api/schedule-overrides", scheduleOverridesRouter);
app.use("/api/blocked-times", blockedTimesRouter);
app.use("/api/availability", availabilityRouter);
app.use("/api/appointments", appointmentsRouter);
app.use("/api/public", publicRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/dashboard", dashboardRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
