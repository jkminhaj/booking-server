import prisma from "../../config/prisma.js";
import ApiError from "../../utils/ApiError.js";

class ServicesService {
  async list(businessId, { page, limit, categoryId, isActive }) {
    const where = {
      businessId,
      ...(categoryId ? { categoryId } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.service.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: "asc" },
        include: { category: true },
      }),
      prisma.service.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async getById(businessId, id) {
    return this.#assertExists(businessId, id);
  }

  async create(businessId, data) {
    if (data.categoryId) await this.#assertCategoryBelongs(businessId, data.categoryId);
    return prisma.service.create({ data: { ...data, businessId } });
  }

  async update(businessId, id, updates) {
    await this.#assertExists(businessId, id);
    if (updates.categoryId) await this.#assertCategoryBelongs(businessId, updates.categoryId);
    return prisma.service.update({ where: { id }, data: updates });
  }

  async updateStatus(businessId, id, isActive) {
    await this.#assertExists(businessId, id);
    return prisma.service.update({ where: { id }, data: { isActive } });
  }

  /** DB restricts delete while appointment history exists — use the
   * isActive toggle to retire a service instead of deleting it. */
  async remove(businessId, id) {
    await this.#assertExists(businessId, id);
    await prisma.service.delete({ where: { id } });
  }

  async getStaff(businessId, serviceId) {
    await this.#assertExists(businessId, serviceId);
    return prisma.staffService.findMany({
      where: { serviceId },
      include: { staff: { select: { id: true, name: true, email: true, image: true, isActive: true } } },
    });
  }

  /** Replaces the full set of staff who can perform this service (PUT semantics). */
  async replaceStaff(businessId, serviceId, staffIds) {
    await this.#assertExists(businessId, serviceId);

    if (staffIds.length > 0) {
      const validCount = await prisma.user.count({ where: { id: { in: staffIds }, businessId } });
      if (validCount !== staffIds.length) {
        throw ApiError.badRequest("One or more staff members do not belong to this business.");
      }
    }

    await prisma.$transaction([
      prisma.staffService.deleteMany({ where: { serviceId } }),
      ...(staffIds.length > 0
        ? [prisma.staffService.createMany({ data: staffIds.map((staffId) => ({ staffId, serviceId })) })]
        : []),
    ]);

    return this.getStaff(businessId, serviceId);
  }

  async #assertExists(businessId, id) {
    const service = await prisma.service.findFirst({ where: { id, businessId } });
    if (!service) throw ApiError.notFound("Service not found.");
    return service;
  }

  async #assertCategoryBelongs(businessId, categoryId) {
    const category = await prisma.serviceCategory.findFirst({ where: { id: categoryId, businessId } });
    if (!category) throw ApiError.badRequest("Category does not belong to this business.");
  }
}

export default new ServicesService();
