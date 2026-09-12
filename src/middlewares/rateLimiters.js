import rateLimit from "express-rate-limit";
import ApiError from "../utils/ApiError.js";

function rateLimitHandler(req, res, next) {
  next(new ApiError(429, "TOO_MANY_REQUESTS", "Too many requests. Please try again later."));
}

const shared = {
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
};

/** Applied to all /api routes. Generous — this is not the security boundary. */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  ...shared,
});

/** Login is brute-force sensitive. Only FAILED attempts count toward the
 * limit, so a legitimate user logging in repeatedly is never blocked. */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  ...shared,
});

/** Registration creates a new tenant — cheap for an attacker to spam. */
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  ...shared,
});

/** Public booking creation + payment-intent creation: unauthenticated, and
 * each call can trigger real work (and, for payments, a Stripe API call). */
export const publicBookingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  ...shared,
});
