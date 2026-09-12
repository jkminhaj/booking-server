import ApiError from "../utils/ApiError.js";
import { Prisma } from "../config/prisma.js";
import { isProduction } from "../config/env.js";

export function notFoundHandler(req, res, next) {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
}

/**
 * Single place that turns any thrown/rejected error into the API's standard
 * envelope: { success: false, error: { code, message, details? } }.
 * Must be registered LAST, after every route — Express recognizes an
 * error handler by its 4-argument signature.
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  let statusCode = 500;
  let code = "INTERNAL_ERROR";
  let message = "Something went wrong. Please try again.";
  let details;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    details = err.details;
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Translate the Prisma error codes this app can actually hit into clean
    // HTTP responses instead of leaking database internals to the client.
    switch (err.code) {
      case "P2002": // unique constraint
        statusCode = 409;
        code = "CONFLICT";
        message = `A record with this ${err.meta?.target ?? "value"} already exists.`;
        break;
      case "P2025": // record to update/delete not found
        statusCode = 404;
        code = "NOT_FOUND";
        message = "Record not found.";
        break;
      case "P2003": // foreign key constraint
        statusCode = 409;
        code = "CONFLICT";
        message = "This action conflicts with related records.";
        break;
      case "P1001": // can't reach database server
      case "P1002": // database server timed out
      case "P1008": // operation timed out
      case "P1017": // server closed the connection
        // Under the driver-adapter architecture this app uses, connection
        // failures surface as PrismaClientKnownRequestError (P1xxx) rather
        // than a separate PrismaClientInitializationError — verified by
        // actually triggering one against an unreachable database.
        statusCode = 503;
        code = "DATABASE_UNAVAILABLE";
        message = "The database is temporarily unavailable. Please try again shortly.";
        break;
      default:
        statusCode = 400;
        code = "DATABASE_ERROR";
        message = "The request could not be processed.";
    }
  } else if (err.type === "entity.parse.failed" || err instanceof SyntaxError) {
    statusCode = 400;
    code = "VALIDATION_ERROR";
    message = "Malformed JSON body.";
  }

  if (statusCode >= 500) {
    // Full detail server-side only — never sent to the client.
    console.error(err);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
      ...(!isProduction && statusCode >= 500 ? { stack: err.stack } : {}),
    },
  });
}
