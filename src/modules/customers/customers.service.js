import prisma from "../../config/prisma.js";
import ApiError from "../../utils/ApiError.js";

class CustomersService {
  async list(businessId, { page, limit }) {
    const where = { businessId };
    const [items, total] = await Promise.all([
      prisma.customer.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: "desc" } }),
      prisma.customer.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async search(businessId, q) {
    return prisma.customer.findMany({
      where: {
        businessId,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { phone: { contains: q } },
        ],
      },
      take: 20,
    });
  }

  async getById(businessId, id) {
    return this.#assertExists(businessId, id);
  }

  async create(businessId, data) {
    return prisma.customer.create({ data: { ...data, businessId } });
  }

  async update(businessId, id, updates) {
    await this.#assertExists(businessId, id);
    return prisma.customer.update({ where: { id }, data: updates });
  }

  /** DB enforces ON DELETE RESTRICT from appointments -> customers, so this
   * will cleanly 409 (via the central Prisma error mapper) for any customer
   * with appointment history instead of silently orphaning records. */
  async remove(businessId, id) {
    await this.#assertExists(businessId, id);
    await prisma.customer.delete({ where: { id } });
  }

  async getAppointments(businessId, customerId, { page, limit }) {
    await this.#assertExists(businessId, customerId);
    const where = { businessId, customerId };
    const [items, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { startAt: "desc" },
        include: { service: true, staff: { select: { id: true, name: true } } },
      }),
      prisma.appointment.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async #assertExists(businessId, id) {
    const customer = await prisma.customer.findFirst({ where: { id, businessId } });
    if (!customer) throw ApiError.notFound("Customer not found.");
    return customer;
  }
}

export default new CustomersService();
