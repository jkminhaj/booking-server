import prisma from "../../config/prisma.js";
import ApiError from "../../utils/ApiError.js";
import { timeStringToDate, dateToTimeString } from "../../utils/time.js";

function serialize(row) {
  return {
    ...row,
    date: row.date.toISOString().slice(0, 10),
    startTime: row.startTime ? dateToTimeString(row.startTime) : null,
    endTime: row.endTime ? dateToTimeString(row.endTime) : null,
  };
}

class ScheduleOverridesService {
  async list(businessId, staffId) {
    const where = { businessId, ...(staffId !== undefined ? { staffId } : {}) };
    const rows = await prisma.scheduleOverride.findMany({ where, orderBy: { date: "asc" } });
    return rows.map(serialize);
  }

  async getByDate(businessId, date, staffId) {
    const where = {
      businessId,
      date: new Date(`${date}T00:00:00.000Z`),
      ...(staffId ? { staffId } : {}),
    };
    const rows = await prisma.scheduleOverride.findMany({ where });
    return rows.map(serialize);
  }

  async getById(businessId, id) {
    return serialize(await this.#assertExists(businessId, id));
  }

  async create(businessId, data) {
    if (data.staffId) await this.#assertStaffBelongs(businessId, data.staffId);

    const dateOnly = new Date(`${data.date}T00:00:00.000Z`);
    const existing = await prisma.scheduleOverride.findFirst({
      where: { businessId, staffId: data.staffId ?? null, date: dateOnly },
    });
    if (existing) throw ApiError.conflict("An override for this date already exists — update it instead.");

    const row = await prisma.scheduleOverride.create({
      data: {
        businessId,
        staffId: data.staffId,
        date: dateOnly,
        isClosed: data.isClosed,
        startTime: data.startTime ? timeStringToDate(data.startTime) : null,
        endTime: data.endTime ? timeStringToDate(data.endTime) : null,
        reason: data.reason,
      },
    });
    return serialize(row);
  }

  async update(businessId, id, updates) {
    await this.#assertExists(businessId, id);
    const data = { ...updates };
    if (updates.startTime) data.startTime = timeStringToDate(updates.startTime);
    if (updates.endTime) data.endTime = timeStringToDate(updates.endTime);
    const row = await prisma.scheduleOverride.update({ where: { id }, data });
    return serialize(row);
  }

  async remove(businessId, id) {
    await this.#assertExists(businessId, id);
    await prisma.scheduleOverride.delete({ where: { id } });
  }

  async #assertExists(businessId, id) {
    const row = await prisma.scheduleOverride.findFirst({ where: { id, businessId } });
    if (!row) throw ApiError.notFound("Schedule override not found.");
    return row;
  }

  async #assertStaffBelongs(businessId, staffId) {
    const staff = await prisma.user.findFirst({ where: { id: staffId, businessId } });
    if (!staff) throw ApiError.badRequest("Staff member does not belong to this business.");
  }
}

export default new ScheduleOverridesService();
