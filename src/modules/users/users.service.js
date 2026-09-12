import prisma, { Role } from "../../config/prisma.js";
import ApiError from "../../utils/ApiError.js";
import { hashPassword } from "../../utils/password.js";
import { sanitizeUser } from "../../utils/sanitize.js";

class UsersService {
  async list(businessId, { page, limit, role, isActive }) {
    const where = {
      businessId,
      ...(role ? { role } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.user.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: "desc" } }),
      prisma.user.count({ where }),
    ]);
    return { items: items.map(sanitizeUser), total, page, limit };
  }

  async getById(businessId, id) {
    return sanitizeUser(await this.#assertExists(businessId, id));
  }

  async create(businessId, data) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw ApiError.conflict("A user with this email already exists.");

    const passwordHash = await hashPassword(data.password);
    const user = await prisma.user.create({
      data: {
        businessId,
        name: data.name,
        email: data.email,
        phone: data.phone,
        role: data.role,
        passwordHash,
      },
    });
    return sanitizeUser(user);
  }

  async update(businessId, id, updates) {
    await this.#assertExists(businessId, id);
    return sanitizeUser(await prisma.user.update({ where: { id }, data: updates }));
  }

  async updateRole(businessId, id, role) {
    const target = await this.#assertExists(businessId, id);
    if (target.role === Role.OWNER) throw ApiError.forbidden("The business owner's role cannot be changed here.");
    return sanitizeUser(await prisma.user.update({ where: { id }, data: { role } }));
  }

  async updateStatus(businessId, id, isActive) {
    const target = await this.#assertExists(businessId, id);
    if (target.role === Role.OWNER && !isActive) {
      throw ApiError.forbidden("The business owner cannot be deactivated.");
    }
    return sanitizeUser(await prisma.user.update({ where: { id }, data: { isActive } }));
  }

  async remove(businessId, id) {
    const target = await this.#assertExists(businessId, id);
    if (target.role === Role.OWNER) throw ApiError.forbidden("The business owner cannot be removed.");
    await prisma.user.delete({ where: { id } });
  }

  async getServices(businessId, staffId) {
    await this.#assertExists(businessId, staffId);
    return prisma.staffService.findMany({ where: { staffId }, include: { service: true } });
  }

  /** Replaces the full set of services this staff member can perform (PUT semantics). */
  async replaceServices(businessId, staffId, serviceIds) {
    await this.#assertExists(businessId, staffId);

    if (serviceIds.length > 0) {
      const validCount = await prisma.service.count({ where: { id: { in: serviceIds }, businessId } });
      if (validCount !== serviceIds.length) {
        throw ApiError.badRequest("One or more services do not belong to this business.");
      }
    }

    await prisma.$transaction([
      prisma.staffService.deleteMany({ where: { staffId } }),
      ...(serviceIds.length > 0
        ? [prisma.staffService.createMany({ data: serviceIds.map((serviceId) => ({ staffId, serviceId })) })]
        : []),
    ]);

    return this.getServices(businessId, staffId);
  }

  async #assertExists(businessId, id) {
    const user = await prisma.user.findFirst({ where: { id, businessId } });
    if (!user) throw ApiError.notFound("Staff member not found.");
    return user;
  }
}

export default new UsersService();
