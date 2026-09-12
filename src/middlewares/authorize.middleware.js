import ApiError from "../utils/ApiError.js";

/**
 * Role gate. Always use AFTER `authenticate`.
 *
 *   router.patch("/:id/role", authenticate, authorize("OWNER", "ADMIN"), ...)
 *
 * Role hierarchy used across this API (see spec §43):
 *   OWNER        -> everything
 *   ADMIN        -> most business management
 *   MANAGER      -> staff + appointments + services
 *   RECEPTIONIST -> customers + appointments
 *   STAFF        -> own appointments/schedule only (enforced in-controller,
 *                   since "own records only" isn't a static role check)
 */
export function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!allowedRoles.includes(req.user.role)) return next(ApiError.forbidden());
    next();
  };
}
