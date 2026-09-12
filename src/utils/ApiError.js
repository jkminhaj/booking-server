/**
 * A known, expected error thrown on purpose (bad input, not found, conflict,
 * forbidden, etc). The central error handler (src/middlewares/error.middleware.js)
 * turns this into the API's standard error envelope. Anything thrown that is
 * NOT an ApiError is treated as an unexpected 500 and logged server-side.
 */
class ApiError extends Error {
  constructor(statusCode, code, message, details = undefined) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  static badRequest(message, code = "VALIDATION_ERROR", details) {
    return new ApiError(400, code, message, details);
  }
  static unauthorized(message = "Authentication required") {
    return new ApiError(401, "UNAUTHORIZED", message);
  }
  static forbidden(message = "You do not have permission to perform this action") {
    return new ApiError(403, "FORBIDDEN", message);
  }
  static notFound(message = "Resource not found") {
    return new ApiError(404, "NOT_FOUND", message);
  }
  static conflict(message, code = "CONFLICT") {
    return new ApiError(409, code, message);
  }
}

export default ApiError;
