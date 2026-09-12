import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

dayjs.extend(utc);
dayjs.extend(timezone);

/** How far apart candidate start times are offered, in minutes. A fixed,
 * easy-to-find constant — change this one line to offer 30-minute slots
 * instead of 15, for example. */
export const DEFAULT_SLOT_INTERVAL_MINUTES = 15;

/** 0 (Sunday) .. 6 (Saturday) for calendar `date` ("YYYY-MM-DD") as seen
 * in the business's timezone — NOT the server's local timezone. */
export function getDayOfWeek(date, tz) {
  return dayjs.tz(date, tz).day();
}

/** Turns "N minutes after local midnight" on `date` (in `tz`) into a UTC Date. */
export function localMinutesToUtcDate(date, minutes, tz) {
  return dayjs.tz(date, tz).startOf("day").add(minutes, "minute").utc().toDate();
}

/** [dayStartUtc, dayEndUtc) for `date` as seen in `tz` — the range to query
 * appointments/blocked times in, so we don't miss anything that crosses
 * midnight UTC but is still "today" for the business. */
export function getUtcDayBounds(date, tz) {
  const start = dayjs.tz(date, tz).startOf("day");
  return { dayStartUtc: start.utc().toDate(), dayEndUtc: start.add(1, "day").utc().toDate() };
}

/** "YYYY-MM-DD" for right now, as seen in `tz`. */
export function getTodayInTimezone(tz) {
  return dayjs().tz(tz).format("YYYY-MM-DD");
}

/** UTC instant -> "YYYY-MM-DD" as seen in `tz`. Used when we're handed a
 * UTC startAt (e.g. a proposed appointment time) and need to know which
 * business-local calendar day it falls on. */
export function utcToLocalDateString(utcDate, tz) {
  return dayjs(utcDate).tz(tz).format("YYYY-MM-DD");
}

/** Converts a UTC instant (e.g. an appointment's startAt) into "minutes
 * since local midnight" of `date` in `tz` — the same unit everything else
 * in this file works in. */
export function utcToMinutesSinceLocalMidnight(utcDate, date, tz) {
  return dayjs(utcDate).tz(tz).diff(dayjs.tz(date, tz).startOf("day"), "minute");
}

/**
 * Resolves the effective working window for one staff member (or the
 * business-level default, when staffId is null) on a given day, in minutes
 * since local midnight. Returns null when closed that day.
 *
 * Precedence (spec §21/§58): a same-day ScheduleOverride always wins over
 * WorkingHours, full stop — that's the entire point of an override.
 */
export function resolveWindow({ override, workingHoursRow }) {
  if (override) {
    if (override.isClosed) return null;
    if (override.startMinutes != null && override.endMinutes != null) {
      return { startMinutes: override.startMinutes, endMinutes: override.endMinutes };
    }
    // Override exists but specifies neither isClosed nor times — treat as
    // "no override" rather than silently hiding the day.
  }
  if (!workingHoursRow || workingHoursRow.startMinutes == null || workingHoursRow.endMinutes == null) {
    return null;
  }
  return { startMinutes: workingHoursRow.startMinutes, endMinutes: workingHoursRow.endMinutes };
}

/**
 * Merges blocked times + existing appointments into a sorted list of
 * non-overlapping occupied [start, end) intervals, in "minutes since local
 * midnight". An appointment's occupied interval includes its service's
 * buffer as trailing time — that's what keeps back-to-back bookings from
 * being scheduled with zero cleanup time in between.
 */
export function buildOccupiedIntervals({ blocked, appointments }) {
  const raw = [
    ...blocked.map((b) => ({ start: b.startMinutes, end: b.endMinutes })),
    ...appointments.map((a) => ({ start: a.startMinutes, end: a.endMinutes + a.bufferMinutes })),
  ]
    .filter((iv) => iv.start < iv.end)
    .sort((a, b) => a.start - b.start);

  const merged = [];
  for (const iv of raw) {
    const last = merged[merged.length - 1];
    if (last && iv.start <= last.end) {
      last.end = Math.max(last.end, iv.end);
    } else {
      merged.push({ ...iv });
    }
  }
  return merged;
}

/**
 * Generates bookable slots inside [windowStart, windowEnd) (minutes since
 * local midnight), one candidate every `stepMinutes`, each occupying
 * `durationMinutes + bufferMinutes` when checked against `occupied` —
 * so a candidate is rejected both when it would start too soon after an
 * existing booking's buffer, and when its own trailing buffer would run
 * into the next booking. Returned slots do NOT include the trailing
 * buffer in `endMinutes` — that's internal spacing, not part of what the
 * customer is booking.
 */
export function generateSlots({
  windowStart,
  windowEnd,
  durationMinutes,
  bufferMinutes,
  occupied,
  stepMinutes = DEFAULT_SLOT_INTERVAL_MINUTES,
}) {
  const slots = [];
  const occupiedSpan = durationMinutes + bufferMinutes;

  for (let start = windowStart; start + durationMinutes <= windowEnd; start += stepMinutes) {
    const occupiedEnd = start + occupiedSpan;
    const hasConflict = occupied.some((iv) => start < iv.end && iv.start < occupiedEnd);
    if (!hasConflict) slots.push({ startMinutes: start, endMinutes: start + durationMinutes });
  }
  return slots;
}
