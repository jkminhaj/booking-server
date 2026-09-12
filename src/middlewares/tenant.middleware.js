import prisma from "../config/prisma.js";
import ApiError from "../utils/ApiError.js";

/**
 * For PUBLIC booking routes only (/api/public/business/:slug/...), where
 * there is no JWT to derive a business from. Resolves the :slug param to a
 * live Business and attaches it as req.business.
 *
 * Authenticated dashboard routes never need this — their tenant context is
 * req.user.businessId, set by `authenticate` from the verified access token.
 */
export async function resolveBusinessBySlug(req, res, next) {
  const { slug } = req.params;
  const business = await prisma.business.findUnique({ where: { slug } });

  if (!business || !business.isActive) {
    return next(ApiError.notFound("Business not found"));
  }

  req.business = business;
  next();
}
