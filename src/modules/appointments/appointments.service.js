import prisma, { AppointmentStatus } from "../../config/prisma.js";
import ApiError from "../../utils/ApiError.js";
import { withSerializableRetry } from "../../utils/withSerializableRetry.js";
import { OCCUPYING_APPOINTMENT_STATUSES, resolveStaffWindow } from "../availability/availability.service.js";
import { getDayOfWeek, localMinutesToUtcDate, utcToLocalDateString } from "../availability/availability.helpers.js";

const ALLOWED_TRANSITIONS = {
  PENDING: ["CONFIRMED", "CANCELLED", "NO_SHOW"],
  CONFIRMED: ["COMPLETED", "CANCELLED", "NO_SHOW"],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

const DEFAULT_INCLUDE = {
  customer: true,
  staff: { select: { id: true, name: true } },
  service: true,
};

function occupiedWindow(startAt, endAt, bufferMinutes) {
  return { start: startAt, end: new Date(endAt.getTime() + bufferMinutes * 60_000) };
}
function windowsOverlap(a, b) {
  return a.start < b.end && b.start < a.end;
}
function dayRangeUtc(date) {
  const start = new Date(`${date}T00:00:00.000Z`);
  return { gte: start, lt: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}

class AppointmentsService {
  async list(businessId, filters) {
    const { page, limit, date, status, staffId, customerId } = filters;
    const where = {
      businessId,
      ...(status ? { status } : {}),
      ...(staffId ? { staffId } : {}),
      ...(customerId ? { customerId } : {}),
      ...(date ? { startAt: dayRangeUtc(date) } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { startAt: "asc" },
        include: DEFAULT_INCLUDE,
      }),
      prisma.appointment.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async getById(businessId, id) {
    return this.#assertExists(businessId, id, { ...DEFAULT_INCLUDE, payments: true });
  }

  async getPayments(businessId, id) {
    const appointment = await this.#assertExists(businessId, id, { payments: true });
    return appointment.payments;
  }

  /**
   * Creates an appointment. Wrapped in a SERIALIZABLE transaction: if two
   * requests race for the same slot, Postgres detects the write conflict
   * and one request gets a clean 409 to retry (see withSerializableRetry).
   * This — not the availability check the client saw a moment earlier — is
   * what actually prevents double-booking (spec §25/§47).
   */
  async create(businessId, input) {
    return withSerializableRetry(prisma, async (tx) => {
      const business = await tx.business.findUnique({ where: { id: businessId } });
      if (!business) throw ApiError.notFound("Business not found.");

      const [customer, staff, service] = await Promise.all([
        tx.customer.findFirst({ where: { id: input.customerId, businessId } }),
        tx.user.findFirst({ where: { id: input.staffId, businessId, isActive: true } }),
        tx.service.findFirst({ where: { id: input.serviceId, businessId, isActive: true } }),
      ]);
      if (!customer) throw ApiError.badRequest("Customer does not belong to this business.");
      if (!staff) throw ApiError.badRequest("Staff member not found or inactive.");
      if (!service) throw ApiError.badRequest("Service not found or inactive.");

      const staffService = await tx.staffService.findFirst({
        where: { staffId: input.staffId, serviceId: input.serviceId, isActive: true },
      });
      if (!staffService) throw ApiError.badRequest("This staff member does not perform this service.");

      const durationMinutes = staffService.customDuration ?? service.durationMinutes;
      const price = staffService.customPrice ?? service.price;
      const startAt = new Date(input.startAt);
      const endAt = new Date(startAt.getTime() + durationMinutes * 60_000);

      await this.#assertWithinWorkingHours(tx, { businessId, staffId: input.staffId, startAt, endAt, tz: business.timezone });
      await this.#assertNoConflict(tx, {
        staffId: input.staffId,
        startAt,
        endAt,
        bufferMinutes: service.bufferMinutes,
      });

      return tx.appointment.create({
        data: {
          businessId,
          customerId: input.customerId,
          staffId: input.staffId,
          serviceId: input.serviceId,
          startAt,
          endAt,
          priceAtBooking: price,
          notes: input.notes,
          status: AppointmentStatus.PENDING,
        },
        include: DEFAULT_INCLUDE,
      });
    });
  }

  /** General update. Only re-validates availability when the change could
   * actually move the appointment (staff, service, or start time) — a
   * plain notes edit skips the transaction/conflict-check entirely. */
  async update(businessId, id, updates) {
    const isReschedule = "startAt" in updates || "staffId" in updates || "serviceId" in updates;

    if (!isReschedule) {
      await this.#assertExists(businessId, id);
      return prisma.appointment.update({ where: { id }, data: updates, include: DEFAULT_INCLUDE });
    }

    return withSerializableRetry(prisma, async (tx) => {
      const existing = await tx.appointment.findFirst({ where: { id, businessId } });
      if (!existing) throw ApiError.notFound("Appointment not found.");
      if (!OCCUPYING_APPOINTMENT_STATUSES.includes(existing.status)) {
        throw ApiError.badRequest("This appointment can no longer be rescheduled.");
      }

      const business = await tx.business.findUnique({ where: { id: businessId } });
      const staffId = updates.staffId ?? existing.staffId;
      const serviceId = updates.serviceId ?? existing.serviceId;

      const [staff, service] = await Promise.all([
        tx.user.findFirst({ where: { id: staffId, businessId, isActive: true } }),
        tx.service.findFirst({ where: { id: serviceId, businessId, isActive: true } }),
      ]);
      if (!staff) throw ApiError.badRequest("Staff member not found or inactive.");
      if (!service) throw ApiError.badRequest("Service not found or inactive.");

      const staffService = await tx.staffService.findFirst({ where: { staffId, serviceId, isActive: true } });
      if (!staffService) throw ApiError.badRequest("This staff member does not perform this service.");

      const durationMinutes = staffService.customDuration ?? service.durationMinutes;
      const startAt = updates.startAt ? new Date(updates.startAt) : existing.startAt;
      const endAt = new Date(startAt.getTime() + durationMinutes * 60_000);

      await this.#assertWithinWorkingHours(tx, { businessId, staffId, startAt, endAt, tz: business.timezone });
      await this.#assertNoConflict(tx, {
        staffId,
        startAt,
        endAt,
        bufferMinutes: service.bufferMinutes,
        excludeAppointmentId: id,
      });

      return tx.appointment.update({
        where: { id },
        data: {
          staffId,
          serviceId,
          startAt,
          endAt,
          ...(updates.notes !== undefined ? { notes: updates.notes } : {}),
        },
        include: DEFAULT_INCLUDE,
      });
    });
  }

  /** DB restricts delete while a payment record exists — cancel the
   * appointment instead of deleting it once money has moved. */
  async remove(businessId, id) {
    await this.#assertExists(businessId, id);
    await prisma.appointment.delete({ where: { id } });
  }

  async transitionStatus(businessId, id, targetStatus, extra = {}) {
    const existing = await this.#assertExists(businessId, id);
    const allowed = ALLOWED_TRANSITIONS[existing.status] ?? [];
    if (!allowed.includes(targetStatus)) {
      throw ApiError.badRequest(`Cannot move an appointment from ${existing.status} to ${targetStatus}.`);
    }

    const data = { status: targetStatus };
    if (targetStatus === AppointmentStatus.CANCELLED) {
      data.cancelledAt = new Date();
      if (extra.reason) data.cancellationReason = extra.reason;
    }

    return prisma.appointment.update({ where: { id }, data, include: DEFAULT_INCLUDE });
  }

  async #assertWithinWorkingHours(db, { businessId, staffId, startAt, endAt, tz }) {
    const date = utcToLocalDateString(startAt, tz);
    const dayOfWeek = getDayOfWeek(date, tz);
    const window = await resolveStaffWindow(db, { businessId, staffId, date, dayOfWeek });

    if (!window) throw ApiError.conflict("Staff member is not working on this day.", "STAFF_NOT_AVAILABLE");

    const windowStartUtc = localMinutesToUtcDate(date, window.startMinutes, tz);
    const windowEndUtc = localMinutesToUtcDate(date, window.endMinutes, tz);
    if (startAt < windowStartUtc || endAt > windowEndUtc) {
      throw ApiError.conflict("This time is outside the staff member's working hours.", "STAFF_NOT_AVAILABLE");
    }
  }

  async #assertNoConflict(tx, { staffId, startAt, endAt, bufferMinutes, excludeAppointmentId }) {
    const candidate = occupiedWindow(startAt, endAt, bufferMinutes);
    // Generous ±1 day margin bounds the fetch (staffId+startAt is indexed);
    // the exact check — including each existing appointment's own buffer —
    // happens in JS below, since Prisma can't filter against a related row's column.
    const marginMs = 24 * 60 * 60 * 1000;

    const [existingAppointments, blocked] = await Promise.all([
      tx.appointment.findMany({
        where: {
          staffId,
          status: { in: OCCUPYING_APPOINTMENT_STATUSES },
          ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
          startAt: { lt: new Date(candidate.end.getTime() + marginMs) },
          endAt: { gt: new Date(candidate.start.getTime() - marginMs) },
        },
        include: { service: { select: { bufferMinutes: true } } },
      }),
      tx.blockedTime.findFirst({
        where: {
          OR: [{ staffId }, { staffId: null }],
          startAt: { lt: candidate.end },
          endAt: { gt: candidate.start },
        },
      }),
    ]);

    if (blocked) throw ApiError.conflict("This time overlaps a blocked period.", "STAFF_NOT_AVAILABLE");

    const conflict = existingAppointments.some((appt) =>
      windowsOverlap(candidate, occupiedWindow(appt.startAt, appt.endAt, appt.service.bufferMinutes))
    );
    if (conflict) {
      throw ApiError.conflict("This time slot conflicts with an existing appointment.", "APPOINTMENT_CONFLICT");
    }
  }

  async #assertExists(businessId, id, include) {
    const appointment = await prisma.appointment.findFirst({ where: { id, businessId }, include });
    if (!appointment) throw ApiError.notFound("Appointment not found.");
    return appointment;
  }
}

export default new AppointmentsService();
