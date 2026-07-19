import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { bookings, reviews } from "@/db/schema";
import { eq, and, isNull, gt, desc } from "drizzle-orm";
import { formatInTimeZone } from "date-fns-tz";
import { sendTelegramMessage, answerTelegramCallback } from "@/lib/telegram";

const RATING_WINDOW_MS = 24 * 60 * 60 * 1000;

interface TelegramUpdate {
  message?: {
    text?: string;
    chat: { id: number };
  };
  callback_query?: {
    id: string;
    data?: string;
    message?: { chat: { id: number } };
  };
}

export async function POST(req: NextRequest) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret && req.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const update: TelegramUpdate = await req.json();

  if (update.message) {
    await handleMessage(update.message);
  } else if (update.callback_query) {
    await handleCallback(update.callback_query);
  }

  return NextResponse.json({ ok: true });
}

async function handleMessage(message: NonNullable<TelegramUpdate["message"]>) {
  const chatId = message.chat.id;
  const text = message.text?.trim() ?? "";

  if (text.startsWith("/start")) {
    const bookingId = text.split(" ")[1]?.trim();
    if (!bookingId) {
      await sendTelegramMessage(chatId, "Send this link from your booking confirmation screen to link it.");
      return;
    }
    await linkBooking(chatId, bookingId);
    return;
  }

  // Not a command - treat as an optional comment on the most recently
  // requested (but not yet answered) review for this chat.
  await attachCommentToPendingReview(chatId, text);
}

async function linkBooking(chatId: number, bookingId: string) {
  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.id, bookingId),
    with: { post: true, master: true },
  });

  if (!booking) {
    await sendTelegramMessage(chatId, "Booking not found. Please use the link from your booking confirmation screen.");
    return;
  }

  await db
    .update(bookings)
    .set({ telegramChatId: String(chatId) })
    .where(eq(bookings.id, bookingId));

  const timezone = "UTC"; // display in the master's timezone would need a schedule lookup; UTC label kept simple here
  const startLabel = formatInTimeZone(booking.startDatetimeUtc, timezone, "EEEE, MMM d 'at' HH:mm 'UTC'");
  const masterName = booking.master?.businessName ?? "the master";

  await sendTelegramMessage(
    chatId,
    `<b>Booking request</b>\n${masterName}\n${booking.post?.description ?? ""}\n${startLabel}${
      booking.post?.durationMinutes ? ` (${booking.post.durationMinutes} min)` : ""
    }\n\nTap below to confirm you'll be there.`,
    [[{ text: "✅ Confirm", callback_data: `confirm:${bookingId}` }]]
  );
}

async function handleCallback(callback: NonNullable<TelegramUpdate["callback_query"]>) {
  const chatId = callback.message?.chat.id;
  const data = callback.data ?? "";

  if (!chatId) {
    await answerTelegramCallback(callback.id);
    return;
  }

  if (data.startsWith("confirm:")) {
    const bookingId = data.slice("confirm:".length);
    await confirmBookingFromBot(chatId, bookingId);
    await answerTelegramCallback(callback.id, "Confirmed!");
    return;
  }

  if (data.startsWith("rate:")) {
    const [, bookingId, ratingStr] = data.split(":");
    await recordRatingFromBot(chatId, bookingId, Number(ratingStr));
    await answerTelegramCallback(callback.id, "Thanks!");
    return;
  }

  await answerTelegramCallback(callback.id);
}

async function confirmBookingFromBot(chatId: number, bookingId: string) {
  const booking = await db.query.bookings.findFirst({ where: eq(bookings.id, bookingId) });
  if (!booking || booking.telegramChatId !== String(chatId)) {
    await sendTelegramMessage(chatId, "This booking isn't linked to this chat.");
    return;
  }

  await db
    .update(bookings)
    .set({ guestConfirmedAt: new Date(), updatedAt: new Date() })
    .where(eq(bookings.id, bookingId));

  await sendTelegramMessage(chatId, "You're confirmed. See you then! We'll follow up here after your appointment.");
}

async function recordRatingFromBot(chatId: number, bookingId: string, rating: number) {
  if (!bookingId || !Number.isInteger(rating) || rating < 1 || rating > 5) return;

  const booking = await db.query.bookings.findFirst({ where: eq(bookings.id, bookingId) });
  if (!booking || booking.telegramChatId !== String(chatId)) return;

  const existing = await db.query.reviews.findFirst({ where: eq(reviews.bookingId, bookingId) });
  if (existing) return;

  await db.insert(reviews).values({
    bookingId,
    masterId: booking.masterId,
    clientId: booking.clientId,
    reviewerName: booking.guestName ?? "Guest",
    rating,
    commentRequestedAt: new Date(),
  });

  await sendTelegramMessage(chatId, "Want to add a comment? Just reply here (optional).");
}

async function attachCommentToPendingReview(chatId: number, text: string) {
  if (!text) return;

  const cutoff = new Date(Date.now() - RATING_WINDOW_MS);
  const [pending] = await db
    .select({ id: reviews.id })
    .from(reviews)
    .innerJoin(bookings, eq(reviews.bookingId, bookings.id))
    .where(
      and(
        eq(bookings.telegramChatId, String(chatId)),
        isNull(reviews.comment),
        gt(reviews.commentRequestedAt, cutoff)
      )
    )
    .orderBy(desc(reviews.commentRequestedAt))
    .limit(1);

  if (!pending) return;

  await db.update(reviews).set({ comment: text }).where(eq(reviews.id, pending.id));
  await sendTelegramMessage(chatId, "Thanks for the feedback!");
}
