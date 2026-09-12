import app from "./app.js";
import { env } from "./src/config/env.js";
import prisma from "./src/config/prisma.js";

async function main() {
  // Fail fast: don't start accepting traffic if the database is unreachable.
  await prisma.$connect();
  console.log("Database connected.");

  const server = app.listen(env.PORT, () => {
    console.log(`Booking SaaS API listening on port ${env.PORT} (${env.NODE_ENV})`);
  });

  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down gracefully...`);
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
    // Safety net in case something hangs and close() never calls back.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
