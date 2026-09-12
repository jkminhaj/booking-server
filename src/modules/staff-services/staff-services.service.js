import prisma from "../../config/prisma.js";
import ApiError from "../../utils/ApiError.js";

class StaffServicesService {
  async list(businessId, { page, limit, staffId, serviceId }) {
    // StaffService has no businessId column of its own — scope through the
    // staff relation (guaranteed to match the service's business, since
    // #assertBelongsToBusiness checks both sides at creation time).
    const where = {
      staff: { businessId },
      ...(staffId ? { staffId } : {}),
      ...(serviceId ? { serviceId } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.staffService.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          staff: { select: { id: true, name: true } },
          service: { select: { id: true, name: true, price: true, durationMinutes: true } },
        },
      }),
      prisma.staffService.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async getById(businessId, id) {
    return this.#assertExists(businessId, id);
  }

  async create(businessId, data) {
    await this.#assertBelongsToBusiness(businessId, data.staffId, data.serviceId);
    return prisma.staffService.create({ data });
  }

  async update(businessId, id, updates) {
    await this.#assertExists(businessId, id);
    return prisma.staffService.update({ where: { id }, data: updates });
  }

  async remove(businessId, id) {
    await this.#assertExists(businessId, id);
    await prisma.staffService.delete({ where: { id } });
  }

  async #assertBelongsToBusiness(businessId, staffId, serviceId) {
    const [staff, service] = await Promise.all([
      prisma.user.findFirst({ where: { id: staffId, businessId } }),
      prisma.service.findFirst({ where: { id: serviceId, businessId } }),
    ]);
    if (!staff) throw ApiError.badRequest("Staff member does not belong to this business.");
    if (!service) throw ApiError.badRequest("Service does not belong to this business.");
  }

  async #assertExists(businessId, id) {
    const staffService = await prisma.staffService.findFirst({
      where: { id, staff: { businessId } },
      include: { staff: true, service: true },
    });
    if (!staffService) throw ApiError.notFound("Staff-service assignment not found.");
    return staffService;
  }
}

export default new StaffServicesService();
