/**
 * Helpers for Prisma @db.Time fields (working hours / schedule overrides).
 * A Postgres TIME column has no timezone or date component — we anchor
 * every value at a fixed UTC date (1970-01-01) so only the hour/minute
 * carry meaning, and always read them back with the UTC getters. Using
 * local getters here would silently shift values by whatever timezone
 * this Node process happens to run in.
 */

/** "09:30" -> Date, for writing to a @db.Time column. */
export function timeStringToDate(hhmm) {
  return new Date(`1970-01-01T${hhmm}:00.000Z`);
}

/** Date (read from a @db.Time column) -> "09:30". */
export function dateToTimeString(date) {
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

/** Minutes since midnight, from either a "HH:mm" string or a @db.Time Date. */
export function toMinutesSinceMidnight(value) {
  if (value instanceof Date) return value.getUTCHours() * 60 + value.getUTCMinutes();
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}
