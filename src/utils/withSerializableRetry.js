import ApiError from "./ApiError.js";
import { Prisma } from "../config/prisma.js";

/**
 * Runs `fn` inside a SERIALIZABLE transaction and retries on a Postgres
 * serialization conflict (Prisma error P2034) — the case where two requests
 * raced to book the same slot and Postgres itself caught it. This is what
 * actually prevents double-booking; see appointments.service.js.
 */
export async function withSerializableRetry(prisma, fn, { retries = 2 } = {}) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await prisma.$transaction(fn, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (err) {
      const isSerializationConflict =
        err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2034";

      if (isSerializationConflict && attempt < retries) {
        continue; // someone else won this round — try again
      }
      if (isSerializationConflict) {
        throw ApiError.conflict(
          "This time slot was just booked by someone else. Please pick another time.",
          "APPOINTMENT_CONFLICT"
        );
      }
      throw err;
    }
  }
}
