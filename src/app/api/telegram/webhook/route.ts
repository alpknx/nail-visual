import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { bookings, reviews } from "@/db/schema";
import { eq, and, isNull, gt, desc } from "drizzle-orm";
import { formatInTimeZone } from "date-fns-tz";
import { sendTelegramMessage, sendTelegramPhoto, answerTelegramCallback, editTelegramMessage, editTelegramCaption, type InlineButton } from "@/lib/telegram";

const RATING_WINDOW_MS = 24 * 60 * 60 * 1000;

interface TelegramUpdate {
  message?: {
    text?: string;
    chat: { id: number };
  };
  callback_query?: {
    id: string;
    data?: string;
    message?: { chat: { id: number }; message_id: number };
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

  const caption = `<b>Booking request</b>\n${masterName}\n${booking.post?.description ?? ""}\n${startLabel}${
    booking.post?.durationMinutes ? ` (${booking.post.durationMinutes} min)` : ""
  }\n\nTap below to confirm you'll be there, or cancel if your plans changed.`;
  const buttons = [[
    { text: "✅ Confirm", callback_data: `confirm:${bookingId}` },
    { text: "❌ Cancel", callback_data: `cancel:${bookingId}` },
  ]];

  if (booking.post?.imageUrl) {
    await sendTelegramPhoto(chatId, booking.post.imageUrl, caption, buttons);
  } else {
    await sendTelegramMessage(chatId, caption, buttons);
  }
}

async function handleCallback(callback: NonNullable<TelegramUpdate["callback_query"]>) {
  const chatId = callback.message?.chat.id;
  const messageId = callback.message?.message_id;
  const data = callback.data ?? "";

  if (!chatId || !messageId) {
    await answerTelegramCallback(callback.id);
    return;
  }

  if (data.startsWith("confirm:")) {
    const bookingId = data.slice("confirm:".length);
    await confirmBookingFromBot(chatId, messageId, bookingId);
    await answerTelegramCallback(callback.id, "Confirmed!");
    return;
  }

  if (data.startsWith("cancel:")) {
    const bookingId = data.slice("cancel:".length);
    await cancelBookingFromBot(chatId, messageId, bookingId);
    await answerTelegramCallback(callback.id, "Cancelled");
    return;
  }

  if (data.startsWith("rate:")) {
    const [, bookingId, ratingStr] = data.split(":");
    await recordRatingFromBot(chatId, messageId, bookingId, Number(ratingStr));
    await answerTelegramCallback(callback.id, "Thanks!");
    return;
  }

  await answerTelegramCallback(callback.id);
}

async function confirmBookingFromBot(chatId: number, messageId: number, bookingId: string) {
  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.id, bookingId),
    with: { post: true },
  });
  if (!booking || booking.telegramChatId !== String(chatId)) {
    await sendTelegramMessage(chatId, "This booking isn't linked to this chat.");
    return;
  }

  // The booking-request card was sent as a photo (sendTelegramPhoto) whenever
  // the post has an image, and Telegram rejects editMessageText on a photo
  // message - must use editMessageCaption there instead, or the button edit
  // silently fails and stale buttons stay tappable forever.
  const editCard = (text: string, buttons?: InlineButton[][]) =>
    booking.post?.imageUrl
      ? editTelegramCaption(chatId, messageId, text, buttons)
      : editTelegramMessage(chatId, messageId, text, buttons);

  // The Cancel/Confirm buttons stay live until this message is edited below,
  // so a second tap can still land here after the booking was already
  // resolved - re-check status instead of trusting the button was one-shot.
  if (booking.status === "cancelled" || booking.status === "completed") {
    await editCard(`This booking is already ${booking.status} - nothing to confirm.`);
    return;
  }

  if (booking.guestConfirmedAt) {
    // Already confirmed - re-show the same state instead of re-writing the DB.
    await editCard(
      "✅ Confirmed. See you then! Plans changed?",
      [[{ text: "❌ Cancel", callback_data: `cancel:${bookingId}` }]]
    );
    return;
  }

  await db
    .update(bookings)
    .set({ guestConfirmedAt: new Date(), updatedAt: new Date() })
    .where(eq(bookings.id, bookingId));

  // Confirm isn't a terminal state - the guest might still need to cancel
  // later if plans change, so keep a Cancel button live. Only Cancel itself
  // is terminal (the booking is erased from the master's calendar).
  await editCard(
    "✅ Confirmed. See you then! We'll follow up here after your appointment.\n\nPlans changed?",
    [[{ text: "❌ Cancel", callback_data: `cancel:${bookingId}` }]]
  );
}

async function cancelBookingFromBot(chatId: number, messageId: number, bookingId: string) {
  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.id, bookingId),
    with: { post: true },
  });
  if (!booking || booking.telegramChatId !== String(chatId)) {
    await sendTelegramMessage(chatId, "This booking isn't linked to this chat.");
    return;
  }

  const editCard = (text: string, buttons?: InlineButton[][]) =>
    booking.post?.imageUrl
      ? editTelegramCaption(chatId, messageId, text, buttons)
      : editTelegramMessage(chatId, messageId, text, buttons);

  if (booking.status === "completed" || booking.status === "cancelled") {
    await editCard(`This booking is already ${booking.status} - nothing to cancel.`);
    return;
  }

  await db
    .update(bookings)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(bookings.id, bookingId));

  await editCard("❌ Cancelled. Hope to see you another time!");
}

async function recordRatingFromBot(chatId: number, messageId: number, bookingId: string, rating: number) {
  if (!bookingId || !Number.isInteger(rating) || rating < 1 || rating > 5) return;

  const booking = await db.query.bookings.findFirst({ where: eq(bookings.id, bookingId) });
  if (!booking || booking.telegramChatId !== String(chatId)) return;

  const existing = await db.query.reviews.findFirst({ where: eq(reviews.bookingId, bookingId) });
  if (existing) {
    await editTelegramMessage(chatId, messageId, "You already rated this appointment - thanks again!");
    return;
  }

  await db.insert(reviews).values({
    bookingId,
    masterId: booking.masterId,
    clientId: booking.clientId,
    reviewerName: booking.guestName ?? "Guest",
    rating,
    commentRequestedAt: new Date(),
  });

  await editTelegramMessage(chatId, messageId, `Thanks for the ${"⭐️".repeat(rating)} rating! Want to add a comment? Just reply here (optional).`);
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
