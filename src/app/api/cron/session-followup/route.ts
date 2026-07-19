import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { bookings } from "@/db/schema";
import { eq, and, lt, isNull, isNotNull } from "drizzle-orm";
import { sendTelegramMessage } from "@/lib/telegram";

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  const justEnded = await db.query.bookings.findMany({
    where: and(eq(bookings.status, "confirmed"), lt(bookings.endDatetimeUtc, now)),
  });

  if (justEnded.length > 0) {
    await db
      .update(bookings)
      .set({ status: "completed", updatedAt: now })
      .where(and(eq(bookings.status, "confirmed"), lt(bookings.endDatetimeUtc, now)));
  }

  const candidates = await db.query.bookings.findMany({
    where: and(
      eq(bookings.status, "completed"),
      isNotNull(bookings.telegramChatId),
      isNull(bookings.reviewRequestedAt)
    ),
    with: { master: true },
  });

  for (const booking of candidates) {
    if (!booking.telegramChatId) continue;
    const masterName = booking.master?.businessName ?? "your master";

    await sendTelegramMessage(
      booking.telegramChatId,
      `How was your appointment with ${masterName}? Tap a rating below.`,
      [
        [
          { text: "⭐️", callback_data: `rate:${booking.id}:1` },
          { text: "⭐️⭐️", callback_data: `rate:${booking.id}:2` },
          { text: "⭐️⭐️⭐️", callback_data: `rate:${booking.id}:3` },
        ],
        [
          { text: "⭐️⭐️⭐️⭐️", callback_data: `rate:${booking.id}:4` },
          { text: "⭐️⭐️⭐️⭐️⭐️", callback_data: `rate:${booking.id}:5` },
        ],
      ]
    );

    await db
      .update(bookings)
      .set({ reviewRequestedAt: now })
      .where(eq(bookings.id, booking.id));
  }

  return NextResponse.json({
    completed: justEnded.length,
    reviewRequestsSent: candidates.length,
  });
}
