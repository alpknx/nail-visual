"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { masterSchedules, scheduleRanges, masterOverrides } from "@/db/schema";
import { z } from "zod";
import { eq, and, gt } from "drizzle-orm";
import { getAvailableSlots } from "@/lib/slots";

export async function getMasterSchedule(masterId: string) {
  const schedule = await db.query.masterSchedules.findFirst({
    where: eq(masterSchedules.masterId, masterId),
    with: {
      ranges: true,
    },
  });

  return schedule ?? null;
}

const scheduleRangeSchema = z.object({
  dayOfWeek: z.number().int().min(1).max(7),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Format must be HH:mm"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Format must be HH:mm"),
});

const upsertScheduleSchema = z.object({
  timezone: z.string().min(1, "Timezone is required"),
  ranges: z.array(scheduleRangeSchema),
});

export async function upsertMasterSchedule(data: z.infer<typeof upsertScheduleSchema>) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "master") {
    throw new Error("Unauthorized");
  }

  const validated = upsertScheduleSchema.parse(data);

  // Upsert schedule record
  const [schedule] = await db
    .insert(masterSchedules)
    .values({
      masterId: session.user.id,
      timezone: validated.timezone,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: masterSchedules.masterId,
      set: {
        timezone: validated.timezone,
        updatedAt: new Date(),
      },
    })
    .returning();

  // Replace all ranges for this schedule
  await db.delete(scheduleRanges).where(eq(scheduleRanges.scheduleId, schedule.id));

  if (validated.ranges.length > 0) {
    await db.insert(scheduleRanges).values(
      validated.ranges.map((r) => ({
        scheduleId: schedule.id,
        dayOfWeek: r.dayOfWeek,
        startTime: r.startTime,
        endTime: r.endTime,
      }))
    );
  }

  return { success: true };
}

const overrideSchema = z.object({
  startDatetimeUtc: z.string().datetime({ offset: true }),
  endDatetimeUtc: z.string().datetime({ offset: true }),
  notes: z.string().max(255).optional(),
});

export async function createMasterOverride(data: z.infer<typeof overrideSchema>) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "master") {
    throw new Error("Unauthorized");
  }

  const validated = overrideSchema.parse(data);

  const start = new Date(validated.startDatetimeUtc);
  const end = new Date(validated.endDatetimeUtc);

  if (end <= start) {
    throw new Error("End time must be after start time");
  }

  const [override] = await db
    .insert(masterOverrides)
    .values({
      masterId: session.user.id,
      startDatetimeUtc: start,
      endDatetimeUtc: end,
      notes: validated.notes,
    })
    .returning();

  return override;
}

export async function deleteMasterOverride(overrideId: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "master") {
    throw new Error("Unauthorized");
  }

  const override = await db.query.masterOverrides.findFirst({
    where: eq(masterOverrides.id, overrideId),
  });

  if (!override || override.masterId !== session.user.id) {
    throw new Error("Not found or unauthorized");
  }

  await db.delete(masterOverrides).where(eq(masterOverrides.id, overrideId));

  return { success: true };
}

export async function getMasterOverrides(masterId: string) {
  const now = new Date();

  // Return only future overrides
  const overrides = await db.query.masterOverrides.findMany({
    where: and(
      eq(masterOverrides.masterId, masterId),
      gt(masterOverrides.endDatetimeUtc, now)
    ),
    orderBy: (masterOverrides, { asc }) => [asc(masterOverrides.startDatetimeUtc)],
  });

  return overrides;
}

export async function getAvailableSlotsAction(
  masterId: string,
  postId: string,
  date: string // "YYYY-MM-DD" in master's timezone
) {
  return getAvailableSlots(masterId, postId, date);
}
