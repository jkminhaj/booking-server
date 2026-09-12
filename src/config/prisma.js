import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  Prisma,
  Role,
  AppointmentStatus,
  PaymentStatus,
  PaymentMethod,
} from "../generated/prisma/client.js";
import { env, isProduction } from "./env.js";

const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
  log: isProduction ? ["error", "warn"] : ["warn", "error"],
});

export default prisma;

// Re-exported so the rest of the app has one canonical place to import both
// the client instance and Prisma's namespace/enums from — no deep imports
// into src/generated scattered across modules.
export { Prisma, Role, AppointmentStatus, PaymentStatus, PaymentMethod };