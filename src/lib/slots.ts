import { db } from "@/db";
import { bookings, masterOverrides, masterSchedules, posts } from "@/db/schema";
import { and, eq, gte, lt, ne } from "drizzle-orm";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import {
  addMinutes,
  startOfDay,
  endOfDay,
  setHours,
  setMinutes,
  setSeconds,
  setMilliseconds,
  isAfter,
  isBefore,
  parseISO,
} from "date-fns";

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
 * Parse "HH:mm" time string and apply it to a given UTC date
 * in the master's local timezone.
 */
function applyLocalTime(dateInTz: Date, timeStr: string, timezone: string): Date {
  const [hh, mm] = timeStr.split(":").map(Number);
  // Build a date in the master's timezone at the given wall-clock time
  const local = setMilliseconds(
    setSeconds(setMinutes(setHours(dateInTz, hh), mm), 0),
    0
  );
  // Convert back to UTC
  return fromZonedTime(local, timezone);
}

/**
 * Check whether two intervals [aStart, aEnd) and [bStart, bEnd) overlap.
 */
function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return isBefore(aStart, bEnd) && isAfter(aEnd, bStart);
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

  // 3. Determine day of week (1=Mon … 7=Sun) in the master's timezone
  const localDay = toZonedTime(parseISO(date), timezone);
  // JS getDay(): 0=Sun … 6=Sat → convert to ISO 1=Mon … 7=Sun
  const jsDay = localDay.getDay();
  const dayOfWeek = jsDay === 0 ? 7 : jsDay;

  // 4. Find ranges for this day
  const todayRanges = schedule.ranges.filter((r) => r.dayOfWeek === dayOfWeek);
  if (todayRanges.length === 0) return [];

  // 5. Build UTC window for the whole day to query DB
  const localStartOfDay = toZonedTime(startOfDay(parseISO(date)), timezone);
  const localEndOfDay   = toZonedTime(endOfDay(parseISO(date)), timezone);
  const windowStart = fromZonedTime(localStartOfDay, timezone);
  const windowEnd   = fromZonedTime(localEndOfDay, timezone);

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
    const rangeStartUtc = applyLocalTime(localDay, range.startTime, timezone);
    const rangeEndUtc   = applyLocalTime(localDay, range.endTime, timezone);

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
