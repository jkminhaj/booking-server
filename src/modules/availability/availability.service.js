import prisma, { AppointmentStatus } from "../../config/prisma.js";
import ApiError from "../../utils/ApiError.js";
import { toMinutesSinceMidnight } from "../../utils/time.js";
import {
  getDayOfWeek,
  getUtcDayBounds,
  localMinutesToUtcDate,
  utcToMinutesSinceLocalMidnight,
  resolveWindow,
  buildOccupiedIntervals,
  generateSlots,
} from "./availability.helpers.js";

// Appointment statuses that still hold a staff member's time. CANCELLED and
// NO_SHOW free the slot back up; COMPLETED is almost always in the past but
// is included for correctness if this is ever queried for a past date.
export const OCCUPYING_APPOINTMENT_STATUSES = [
  AppointmentStatus.PENDING,
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.COMPLETED,
];

function overrideToMinutes(row) {
  if (!row) return null;
  return {
    isClosed: row.isClosed,
    startMinutes: row.startTime ? toMinutesSinceMidnight(row.startTime) : null,
    endMinutes: row.endTime ? toMinutesSinceMidnight(row.endTime) : null,
  };
}

function workingHoursToMinutes(row) {
  if (!row) return null;
  return {
    startMinutes: row.startTime ? toMinutesSinceMidnight(row.startTime) : null,
    endMinutes: row.endTime ? toMinutesSinceMidnight(row.endTime) : null,
  };
}

/**
 * Resolves one staff member's effective working window for one date.
 * Exported (not a class method) so both the availability engine below and
 * the appointments module (which validates a booking is actually inside
 * working hours before creating it) share this exact logic.
 *
 * `db` is either the plain `prisma` client or a `tx` transaction client —
 * both expose the same query API, so appointments.service.js can call this
 * from inside its booking transaction and get a consistent read.
 */
export async function resolveStaffWindow(db, { businessId, staffId, date, dayOfWeek }) {
  const dateOnly = new Date(`${date}T00:00:00.000Z`);
  const [staffOverride, businessOverride, staffHours, businessHours] = await Promise.all([
    db.scheduleOverride.findFirst({ where: { businessId, staffId, date: dateOnly } }),
    db.scheduleOverride.findFirst({ where: { businessId, staffId: null, date: dateOnly } }),
    db.workingHours.findFirst({ where: { businessId, staffId, dayOfWeek } }),
    db.workingHours.findFirst({ where: { businessId, staffId: null, dayOfWeek } }),
  ]);

  return resolveWindow({
    override: overrideToMinutes(staffOverride ?? businessOverride),
    workingHoursRow: workingHoursToMinutes(staffHours ?? businessHours),
  });
}

class AvailabilityService {
  /**
   * The core scheduling engine (spec §21/§58). Given a business + service +
   * date (and optionally one staff member), returns every eligible staff
   * member's bookable slots for that day.
   */
  async getAvailability({ businessId, serviceId, date, staffId }) {
    const business = await prisma.business.findUnique({ where: { id: businessId } });
    if (!business) throw ApiError.notFound("Business not found.");

    const service = await prisma.service.findFirst({ where: { id: serviceId, businessId, isActive: true } });
    if (!service) throw ApiError.notFound("Service not found or inactive.");

    const eligibleAssignments = await prisma.staffService.findMany({
      where: {
        serviceId,
        isActive: true,
        staff: { businessId, isActive: true, ...(staffId ? { id: staffId } : {}) },
      },
      include: { staff: { select: { id: true, name: true } } },
    });

    if (staffId && eligibleAssignments.length === 0) {
      throw ApiError.badRequest("This staff member does not perform the selected service.");
    }

    const tz = business.timezone;
    const dayOfWeek = getDayOfWeek(date, tz);
    const { dayStartUtc, dayEndUtc } = getUtcDayBounds(date, tz);

    // One small set of queries per eligible staff member. Booking-SaaS teams
    // are small (a handful to a few dozen staff per business), so this stays
    // fast without needing to batch-fetch-and-group in memory — if that ever
    // becomes worth it, this is the one place to change.
    const staffResults = await Promise.all(
      eligibleAssignments.map(async (assignment) => {
        const staff = assignment.staff;
        const durationMinutes = assignment.customDuration ?? service.durationMinutes;
        const bufferMinutes = service.bufferMinutes;

        const [window, blockedRaw, appointmentsRaw] = await Promise.all([
          resolveStaffWindow(prisma, { businessId, staffId: staff.id, date, dayOfWeek }),
          prisma.blockedTime.findMany({
            where: {
              businessId,
              OR: [{ staffId: staff.id }, { staffId: null }],
              startAt: { lt: dayEndUtc },
              endAt: { gt: dayStartUtc },
            },
          }),
          prisma.appointment.findMany({
            where: {
              businessId,
              staffId: staff.id,
              status: { in: OCCUPYING_APPOINTMENT_STATUSES },
              startAt: { lt: dayEndUtc },
              endAt: { gt: dayStartUtc },
            },
            include: { service: { select: { bufferMinutes: true } } },
          }),
        ]);

        if (!window) return { staffId: staff.id, name: staff.name, slots: [] };

        const occupied = buildOccupiedIntervals({
          blocked: blockedRaw.map((b) => ({
            startMinutes: utcToMinutesSinceLocalMidnight(b.startAt, date, tz),
            endMinutes: utcToMinutesSinceLocalMidnight(b.endAt, date, tz),
          })),
          appointments: appointmentsRaw.map((a) => ({
            startMinutes: utcToMinutesSinceLocalMidnight(a.startAt, date, tz),
            endMinutes: utcToMinutesSinceLocalMidnight(a.endAt, date, tz),
            bufferMinutes: a.service.bufferMinutes,
          })),
        });

        const slots = generateSlots({
          windowStart: window.startMinutes,
          windowEnd: window.endMinutes,
          durationMinutes,
          bufferMinutes,
          occupied,
        }).map((s) => ({
          startAt: localMinutesToUtcDate(date, s.startMinutes, tz).toISOString(),
          endAt: localMinutesToUtcDate(date, s.endMinutes, tz).toISOString(),
        }));

        return { staffId: staff.id, name: staff.name, slots };
      })
    );

    return {
      date,
      service: {
        id: service.id,
        name: service.name,
        durationMinutes: service.durationMinutes,
        bufferMinutes: service.bufferMinutes,
      },
      staff: staffResults,
    };
  }
}

export default new AvailabilityService();
