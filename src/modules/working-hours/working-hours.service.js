import prisma from "../../config/prisma.js";
import ApiError from "../../utils/ApiError.js";
import { timeStringToDate, dateToTimeString } from "../../utils/time.js";

function serialize(row) {
  return { ...row, startTime: dateToTimeString(row.startTime), endTime: dateToTimeString(row.endTime) };
}

class WorkingHoursService {
  async listBusinessHours(businessId) {
    const rows = await prisma.workingHours.findMany({
      where: { businessId, staffId: null },
      orderBy: { dayOfWeek: "asc" },
    });
    return rows.map(serialize);
  }

  async getForStaff(businessId, staffId) {
    await this.#assertStaffBelongs(businessId, staffId);
    const rows = await prisma.workingHours.findMany({
      where: { businessId, staffId },
      orderBy: { dayOfWeek: "asc" },
    });
    return rows.map(serialize);
  }

  async create(businessId, data) {
    if (data.staffId) await this.#assertStaffBelongs(businessId, data.staffId);

    const existing = await prisma.workingHours.findFirst({
      where: { businessId, staffId: data.staffId ?? null, dayOfWeek: data.dayOfWeek },
    });
    if (existing) {
      throw ApiError.conflict("Working hours for this day already exist — update them instead.");
    }

    const row = await prisma.workingHours.create({
      data: {
        businessId,
        staffId: data.staffId,
        dayOfWeek: data.dayOfWeek,
        startTime: timeStringToDate(data.startTime),
        endTime: timeStringToDate(data.endTime),
      },
    });
    return serialize(row);
  }

  async update(businessId, id, updates) {
    const existing = await this.#assertExists(businessId, id);
    const startTime = updates.startTime ? timeStringToDate(updates.startTime) : existing.startTime;
    const endTime = updates.endTime ? timeStringToDate(updates.endTime) : existing.endTime;
    if (startTime >= endTime) throw ApiError.badRequest("startTime must be before endTime");

    const row = await prisma.workingHours.update({ where: { id }, data: { startTime, endTime } });
    return serialize(row);
  }

  async remove(businessId, id) {
    await this.#assertExists(businessId, id);
    await prisma.workingHours.delete({ where: { id } });
  }

  /** Replaces a staff member's entire weekly schedule in one transaction. */
  async replaceStaffWeek(businessId, staffId, days) {
    await this.#assertStaffBelongs(businessId, staffId);

    const seenDays = new Set();
    for (const day of days) {
      if (seenDays.has(day.dayOfWeek)) throw ApiError.badRequest(`Duplicate dayOfWeek ${day.dayOfWeek} in request.`);
      seenDays.add(day.dayOfWeek);
    }

    await prisma.$transaction([
      prisma.workingHours.deleteMany({ where: { businessId, staffId } }),
      ...(days.length > 0
        ? [
            prisma.workingHours.createMany({
              data: days.map((day) => ({
                businessId,
                staffId,
                dayOfWeek: day.dayOfWeek,
                startTime: timeStringToDate(day.startTime),
                endTime: timeStringToDate(day.endTime),
              })),
            }),
          ]
        : []),
    ]);

    return this.getForStaff(businessId, staffId);
  }

  async #assertExists(businessId, id) {
    const row = await prisma.workingHours.findFirst({ where: { id, businessId } });
    if (!row) throw ApiError.notFound("Working hours entry not found.");
    return row;
  }

  async #assertStaffBelongs(businessId, staffId) {
    const staff = await prisma.user.findFirst({ where: { id: staffId, businessId } });
    if (!staff) throw ApiError.badRequest("Staff member does not belong to this business.");
  }
}

export default new WorkingHoursService();
