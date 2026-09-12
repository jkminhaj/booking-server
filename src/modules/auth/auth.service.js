import prisma, { Role } from "../../config/prisma.js";
import ApiError from "../../utils/ApiError.js";
import { hashPassword, comparePassword } from "../../utils/password.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  decodeRefreshTokenIgnoringExpiry,
} from "../../utils/jwt.js";
import { slugify } from "../../utils/slugify.js";
import { sanitizeUser } from "../../utils/sanitize.js";

/** Turns a business name into a unique URL slug, appending -2, -3, ... on collision. */
async function generateUniqueSlug(name) {
  const base = slugify(name) || "business";
  let slug = base;
  let suffix = 1;
  while (await prisma.business.findUnique({ where: { slug } })) {
    suffix += 1;
    slug = `${base}-${suffix}`;
  }
  return slug;
}

function issueSession(user) {
  return {
    accessToken: signAccessToken(user),
    refreshToken: signRefreshToken(user),
    user: sanitizeUser(user),
  };
}

class AuthService {
  /** Registers a brand-new business together with its first user (OWNER). */
  async register({ business, owner }) {
    const existing = await prisma.user.findUnique({ where: { email: owner.email } });
    if (existing) throw ApiError.conflict("An account with this email already exists.");

    const slug = await generateUniqueSlug(business.name);
    const passwordHash = await hashPassword(owner.password);

    const createdUser = await prisma.$transaction(async (tx) => {
      const createdBusiness = await tx.business.create({
        data: {
          name: business.name,
          slug,
          email: business.email,
          phone: business.phone,
          timezone: business.timezone || "Europe/London",
        },
      });

      return tx.user.create({
        data: {
          businessId: createdBusiness.id,
          name: owner.name,
          email: owner.email,
          passwordHash,
          role: Role.OWNER,
        },
      });
    });

    return issueSession(createdUser);
  }

  async login({ email, password }) {
    const user = await prisma.user.findUnique({ where: { email } });
    // Same error for "no such user" and "wrong password" — don't reveal
    // which one it was, that would let an attacker enumerate real emails.
    if (!user || !user.isActive) throw ApiError.unauthorized("Invalid email or password.");

    const passwordMatches = await comparePassword(password, user.passwordHash);
    if (!passwordMatches) throw ApiError.unauthorized("Invalid email or password.");

    return issueSession(user);
  }

  async refresh(refreshToken) {
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw ApiError.unauthorized("Session expired. Please log in again.");
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });

    // tokenVersion mismatch means this refresh token was revoked (logout,
    // password change, or a newer refresh already rotated past it).
    if (!user || !user.isActive || user.tokenVersion !== payload.tokenVersion) {
      throw ApiError.unauthorized("Session expired. Please log in again.");
    }

    return issueSession(user);
  }

  /** Bumping tokenVersion invalidates every refresh token issued before now. */
  async logout(refreshToken) {
    if (!refreshToken) return;
    try {
      const payload = decodeRefreshTokenIgnoringExpiry(refreshToken);
      await prisma.user.update({
        where: { id: payload.sub },
        data: { tokenVersion: { increment: 1 } },
      });
    } catch {
      // Malformed token or user no longer exists — nothing to revoke.
      // Logout should never fail from the caller's point of view.
    }
  }

  async me(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { business: true },
    });
    if (!user) throw ApiError.notFound("User not found.");
    return sanitizeUser(user);
  }

  async updateProfile(userId, updates) {
    const user = await prisma.user.update({ where: { id: userId }, data: updates });
    return sanitizeUser(user);
  }

  async changePassword(userId, { currentPassword, newPassword }) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw ApiError.notFound("User not found.");

    const currentMatches = await comparePassword(currentPassword, user.passwordHash);
    if (!currentMatches) throw ApiError.badRequest("Current password is incorrect.");

    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: userId },
      // Also bump tokenVersion: changing your password logs you out
      // everywhere else, which is what a user expects after a change.
      data: { passwordHash, tokenVersion: { increment: 1 } },
    });
  }
}

export default new AuthService();
