import ApiError from "../utils/ApiError.js";

/**
 * Validates the request against a Zod schema shaped like
 * { body?, query?, params? } and writes the parsed (trimmed, coerced,
 * defaulted) result onto req.valid — e.g. req.valid.body, req.valid.query.
 *
 * We deliberately do NOT reassign req.query / req.body / req.params
 * directly: in Express 5, req.query is a getter with no setter, so
 * `req.query = ...` throws under ESM's strict mode. req.valid sidesteps
 * that entirely and makes "this came from a validated schema" explicit
 * at every call site.
 */
export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      }));
      return next(ApiError.badRequest("Validation failed", "VALIDATION_ERROR", details));
    }

    req.valid = result.data;
    next();
  };
}
