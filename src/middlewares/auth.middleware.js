import ApiError from "../utils/ApiError.js";
import { verifyAccessToken } from "../utils/jwt.js";

/**
 * Verifies the "Authorization: Bearer <token>" header and attaches the
 * decoded identity to req.user = { id, businessId, role }.
 *
 * Every authenticated route scopes its database queries by
 * req.user.businessId. That value always comes from the signed access
 * token — never from a businessId in the request body or query string —
 * which is what makes cross-tenant data leaks structurally impossible
 * rather than something every controller has to remember to check.
 */
export function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return next(ApiError.unauthorized("Missing or invalid Authorization header"));
  }

  const token = header.slice("Bearer ".length);

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      businessId: payload.businessId,
      role: payload.role,
    };
    next();
  } catch {
    next(ApiError.unauthorized("Invalid or expired access token"));
  }
}
