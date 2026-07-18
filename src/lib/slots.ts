import { db } from "@/db";
import { bookings, masterOverrides, masterSchedules, posts } from "@/db/schema";
import { and, eq, gte, lt, ne } from "drizzle-orm";
import { fromZonedTime, formatInTimeZone } from "date-fns-tz";
import { addMinutes, isAfter, isBefore } from "date-fns";

// Step size for slot generation (minutes)
const SLOT_STEP_MINUTES = 15;

export interface AvailableSlot {
  startUtc: string; // ISO 8601
}

interface BusyInterval {
  start: Date; // UTC
  end: Date;   // UTC
}

/**
 * Given a "YYYY-MM-DD" calendar date and an "HH:mm" wall-clock time, return
 * the UTC instant that wall-clock time falls on in the given IANA timezone.
 *
 * Deliberately avoids date-fns's parseISO()/new Date(y, m, d) here: both
 * interpret a bare date as midnight in the *runtime's* system-local
 * timezone, which silently shifts the calendar day whenever the server's
 * OS timezone differs from `timezone` (or from whatever timezone produced
 * the date string client-side). fromZonedTime() parses the numeric
 * components of the string directly and is not affected by system TZ.
 */
function applyLocalTime(dateStr: string, timeStr: string, timezone: string): Date {
  return fromZonedTime(`${dateStr}T${timeStr}:00`, timezone);
}

/**
 * Check whether two intervals [aStart, aEnd) and [bStart, bEnd) overlap.
 */
function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return isBefore(aStart, bEnd) && isAfter(aEnd, bStart);
}

/**
 * Returns the master's schedule timezone, or "UTC" if none is set yet.
 */
export async function getMasterTimezone(masterId: string): Promise<string> {
  const schedule = await db.query.masterSchedules.findFirst({
    where: eq(masterSchedules.masterId, masterId),
  });
  return schedule?.timezone ?? "UTC";
}

/**
 * Given a UTC instant, return its calendar date ("YYYY-MM-DD") as it falls
 * in the given IANA timezone. Use this instead of `isoString.slice(0, 10)`
 * when re-deriving a date for getAvailableSlots() from a UTC datetime - a
 * plain slice gives the *UTC* calendar date, which can be a different day
 * than the master's-timezone calendar date for slots near midnight in a
 * non-UTC timezone.
 */
export function dateStrInTimezone(instant: Date | string, timezone: string): string {
  return formatInTimeZone(instant, timezone, "yyyy-MM-dd");
}

/**
 * Returns available booking slots for a master on a given date.
 *
 * @param masterId  - master_profiles.user_id
 * @param postId    - post to book (determines durationMinutes)
 * @param date      - ISO date string ("YYYY-MM-DD") in the master's timezone
 */
export async function getAvailableSlots(
  masterId: string,
  postId: string,
  date: string
): Promise<AvailableSlot[]> {
  // 1. Load the post to get duration
  const post = await db.query.posts.findFirst({
    where: eq(posts.id, postId),
  });

  if (!post?.durationMinutes) return [];

  const duration = post.durationMinutes;

  // 2. Load master schedule + timezone
  const schedule = await db.query.masterSchedules.findFirst({
    where: eq(masterSchedules.masterId, masterId),
    with: { ranges: true },
  });

  if (!schedule || schedule.ranges.length === 0) return [];

  const timezone = schedule.timezone;

  // 3. Determine day of week (1=Mon … 7=Sun) directly from the date's Y/M/D -
  // `date` is already "the calendar date in the master's timezone" per the
  // JSDoc above, so day-of-week needs no timezone conversion at all. Using
  // Date.UTC keeps this independent of the server's system-local timezone.
  const [y, m, d] = date.split("-").map(Number);
  const jsDay = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  // JS getUTCDay(): 0=Sun … 6=Sat → convert to ISO 1=Mon … 7=Sun
  const dayOfWeek = jsDay === 0 ? 7 : jsDay;

  // 4. Find ranges for this day
  const todayRanges = schedule.ranges.filter((r) => r.dayOfWeek === dayOfWeek);
  if (todayRanges.length === 0) return [];

  // 5. Build UTC window for the whole day to query DB
  const windowStart = fromZonedTime(`${date}T00:00:00`, timezone);
  const windowEnd = fromZonedTime(`${date}T23:59:59.999`, timezone);

  // 6. Fetch busy intervals (active bookings + overrides) in one go
  const [activeBookings, activeOverrides] = await Promise.all([
    db.query.bookings.findMany({
      where: and(
        eq(bookings.masterId, masterId),
        ne(bookings.status, "cancelled"),
        gte(bookings.startDatetimeUtc, windowStart),
        lt(bookings.startDatetimeUtc, windowEnd)
      ),
    }),
    db.query.masterOverrides.findMany({
      where: and(
        eq(masterOverrides.masterId, masterId),
        gte(masterOverrides.startDatetimeUtc, windowStart),
        lt(masterOverrides.startDatetimeUtc, windowEnd)
      ),
    }),
  ]);

  const busy: BusyInterval[] = [
    ...activeBookings.map((b) => ({
      start: b.startDatetimeUtc,
      end: b.endDatetimeUtc,
    })),
    ...activeOverrides.map((o) => ({
      start: o.startDatetimeUtc,
      end: o.endDatetimeUtc,
    })),
  ];

  // 7. Generate candidate slots per working range
  const slots: AvailableSlot[] = [];
  const now = new Date();

  for (const range of todayRanges) {
    const rangeStartUtc = applyLocalTime(date, range.startTime, timezone);
    const rangeEndUtc   = applyLocalTime(date, range.endTime, timezone);

    let cursor = rangeStartUtc;

    while (true) {
      const slotEnd = addMinutes(cursor, duration);

      // Slot must fit within the working range
      if (!isBefore(slotEnd, rangeEndUtc) && slotEnd.getTime() !== rangeEndUtc.getTime()) {
        break;
      }

      // Slot must be in the future (add 15 min buffer)
      if (isAfter(cursor, addMinutes(now, 15))) {
        // Slot must not overlap any busy interval
        const isFree = !busy.some((b) => overlaps(cursor, slotEnd, b.start, b.end));

        if (isFree) {
          slots.push({ startUtc: cursor.toISOString() });
        }
      }

      cursor = addMinutes(cursor, SLOT_STEP_MINUTES);
    }
  }

  return slots;
}
