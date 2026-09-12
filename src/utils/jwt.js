import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

/**
 * Access token: short-lived, sent as "Authorization: Bearer <token>" on every
 * request, never stored in a cookie. Carries just enough to authorize a
 * request without hitting the database.
 */
export function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, businessId: user.businessId, role: user.role },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRES_IN }
  );
}

/**
 * Refresh token: long-lived, sent only inside an httpOnly cookie, used only
 * to mint new access tokens at POST /api/auth/refresh. Carries the user's
 * tokenVersion so logout / password-change can invalidate it instantly by
 * bumping that number in the database — no separate token blacklist needed.
 */
export function signRefreshToken(user) {
  return jwt.sign(
    { sub: user.id, tokenVersion: user.tokenVersion },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES_IN }
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET);
}

/** Decodes a refresh token without checking its expiry — used only so logout
 * can identify (and revoke) a session even if the token has already expired. */
export function decodeRefreshTokenIgnoringExpiry(token) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET, { ignoreExpiration: true });
}

export const REFRESH_COOKIE_NAME = "refreshToken";
export const REFRESH_COOKIE_PATH = "/api/auth";

export function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: REFRESH_COOKIE_PATH,
    maxAge: msFromDuration(env.JWT_REFRESH_EXPIRES_IN),
  };
}

// Tiny "30d" / "15m" / "12h" -> milliseconds parser, just enough for cookie maxAge.
function msFromDuration(duration) {
  const match = /^(\d+)\s*(ms|s|m|h|d)$/.exec(duration.trim());
  if (!match) return 30 * 24 * 60 * 60 * 1000; // sane fallback: 30 days
  const value = Number(match[1]);
  const unitMs = { ms: 1, s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[match[2]];
  return value * unitMs;
}
