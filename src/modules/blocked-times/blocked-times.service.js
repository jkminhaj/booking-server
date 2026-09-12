import prisma from "../../config/prisma.js";
import ApiError from "../../utils/ApiError.js";

class BlockedTimesService {
  async list(businessId, { staffId, from, to }) {
    const where = {
      businessId,
      ...(staffId !== undefined ? { staffId } : {}),
      ...(from || to
        ? { startAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } }
        : {}),
    };
    return prisma.blockedTime.findMany({ where, orderBy: { startAt: "asc" } });
  }

  async getForStaff(businessId, staffId) {
    await this.#assertStaffBelongs(businessId, staffId);
    return prisma.blockedTime.findMany({ where: { businessId, staffId }, orderBy: { startAt: "asc" } });
  }

  async getById(businessId, id) {
    return this.#assertExists(businessId, id);
  }

  async create(businessId, data) {
    if (data.staffId) await this.#assertStaffBelongs(businessId, data.staffId);
    return prisma.blockedTime.create({
      data: {
        businessId,
        staffId: data.staffId,
        startAt: new Date(data.startAt),
        endAt: new Date(data.endAt),
        reason: data.reason,
      },
    });
  }

  async update(businessId, id, updates) {
    const existing = await this.#assertExists(businessId, id);
    const startAt = updates.startAt ? new Date(updates.startAt) : existing.startAt;
    const endAt = updates.endAt ? new Date(updates.endAt) : existing.endAt;
    if (startAt >= endAt) throw ApiError.badRequest("startAt must be before endAt");

    return prisma.blockedTime.update({
      where: { id },
      data: { startAt, endAt, ...(updates.reason !== undefined ? { reason: updates.reason } : {}) },
    });
  }

  async remove(businessId, id) {
    await this.#assertExists(businessId, id);
    await prisma.blockedTime.delete({ where: { id } });
  }

  async #assertExists(businessId, id) {
    const row = await prisma.blockedTime.findFirst({ where: { id, businessId } });
    if (!row) throw ApiError.notFound("Blocked time not found.");
    return row;
  }

  async #assertStaffBelongs(businessId, staffId) {
    const staff = await prisma.user.findFirst({ where: { id: staffId, businessId } });
    if (!staff) throw ApiError.badRequest("Staff member does not belong to this business.");
  }
}

export default new BlockedTimesService();
