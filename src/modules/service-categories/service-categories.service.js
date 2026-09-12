import prisma from "../../config/prisma.js";
import ApiError from "../../utils/ApiError.js";

class ServiceCategoriesService {
  async list(businessId, { page, limit, isActive }) {
    const where = { businessId, ...(isActive !== undefined ? { isActive } : {}) };
    const [items, total] = await Promise.all([
      prisma.serviceCategory.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { name: "asc" } }),
      prisma.serviceCategory.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async getById(businessId, id) {
    return this.#assertExists(businessId, id);
  }

  async create(businessId, data) {
    return prisma.serviceCategory.create({ data: { ...data, businessId } });
  }

  async update(businessId, id, updates) {
    await this.#assertExists(businessId, id);
    return prisma.serviceCategory.update({ where: { id }, data: updates });
  }

  async updateStatus(businessId, id, isActive) {
    await this.#assertExists(businessId, id);
    return prisma.serviceCategory.update({ where: { id }, data: { isActive } });
  }

  /** DB sets services.categoryId to NULL on category delete (ON DELETE SET
   * NULL) rather than cascading — deleting a category never deletes services. */
  async remove(businessId, id) {
    await this.#assertExists(businessId, id);
    await prisma.serviceCategory.delete({ where: { id } });
  }

  async getServices(businessId, categoryId) {
    await this.#assertExists(businessId, categoryId);
    return prisma.service.findMany({ where: { categoryId, businessId } });
  }

  async #assertExists(businessId, id) {
    const category = await prisma.serviceCategory.findFirst({ where: { id, businessId } });
    if (!category) throw ApiError.notFound("Service category not found.");
    return category;
  }
}

export default new ServiceCategoriesService();
