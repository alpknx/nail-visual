"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { posts, masterSchedules, masterOverrides, bookings, reviews } from "@/db/schema";
import { z } from "zod";
import { eq, and, lt, ne, gte } from "drizzle-orm";
import { getAvailableSlots, getMasterTimezone, dateStrInTimezone } from "@/lib/slots";
import { addMinutes } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import { isRateLimited } from "@/lib/rate-limit";

export async function previewBooking(
  masterId: string,
  postId: string,
  datetimeUtc: string
) {
  const post = await db.query.posts.findFirst({
    where: eq(posts.id, postId),
    with: { author: true },
  });

  if (!post || !post.durationMinutes) {
    throw new Error("Post not found or missing duration");
  }

  if (post.masterId !== masterId) {
    throw new Error("Post does not belong to this master");
  }

  const start = new Date(datetimeUtc);
  const end = addMinutes(start, post.durationMinutes);

  // Verify the slot is still free. Derive the date in the master's own
  // timezone, not a UTC slice - near midnight in a non-UTC timezone those
  // can be different calendar days.
  const timezone = await getMasterTimezone(masterId);
  const slots = await getAvailableSlots(masterId, postId, dateStrInTimezone(start, timezone));
  const stillFree = slots.some((s) => s.startUtc === start.toISOString());

  if (!stillFree) {
    throw new Error("This slot is no longer available");
  }

  return {
    master: {
      id: post.author!.userId,
      businessName: post.author!.businessName,
      avatarUrl: post.author!.avatarUrl,
      phoneNumber: post.author!.phoneNumber,
      phoneCountryCode: post.author!.phoneCountryCode,
    },
    post: {
      id: post.id,
      imageUrl: post.imageUrl,
      description: post.description,
      price: post.price,
      currency: post.currency,
      durationMinutes: post.durationMinutes,
    },
    startUtc: start.toISOString(),
    endUtc: end.toISOString(),
  };
}

const guestSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  phone: z.string().max(50).optional(),
});

const createBookingSchema = z.object({
  masterId: z.string().uuid(),
  postId: z.string().uuid(),
  datetimeUtc: z.string().datetime({ offset: true }),
  notes: z.string().max(500).optional(),
  guest: guestSchema.optional(),
});

export async function createBooking(data: z.infer<typeof createBookingSchema>) {
  const session = await getServerSession(authOptions);

  if (session?.user && session.user.role !== "client") {
    throw new Error("Unauthorized — only clients can book");
  }

  const validated = createBookingSchema.parse(data);
  const isGuest = !session?.user;

  if (isGuest && !validated.guest) {
    throw new Error("Name is required to book without an account");
  }

  if (isGuest) {
    const { headers } = await import("next/headers");
    const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const limited = await isRateLimited(`guest-booking:${ip}`, 5, 3600000);
    if (limited) {
      throw new Error("Too many booking attempts. Please try again later.");
    }
  }

  const post = await db.query.posts.findFirst({
    where: eq(posts.id, validated.postId),
    with: { author: true },
  });

  if (!post?.durationMinutes || post.masterId !== validated.masterId) {
    throw new Error("Post not found or invalid");
  }

  const start = new Date(validated.datetimeUtc);
  const end = addMinutes(start, post.durationMinutes);

  // Race condition check: verify slot is still free. Derive the date in the
  // master's own timezone, not a UTC slice - see previewBooking above.
  const timezone = await getMasterTimezone(validated.masterId);
  const slots = await getAvailableSlots(
    validated.masterId,
    validated.postId,
    dateStrInTimezone(start, timezone)
  );
  const isAvailable = slots.some((s) => s.startUtc === start.toISOString());

  if (!isAvailable) {
    throw new Error("This slot is no longer available");
  }

  const [booking] = await db
    .insert(bookings)
    .values({
      masterId: validated.masterId,
      postId: validated.postId,
      clientId: session?.user?.id ?? null,
      guestName: isGuest ? validated.guest!.name : null,
      guestPhone: isGuest ? (validated.guest!.phone ?? null) : null,
      status: "pending",
      startDatetimeUtc: start,
      endDatetimeUtc: end,
      notes: validated.notes,
    })
    .returning();

  return booking;
}

export async function cancelBooking(bookingId: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "client") {
    throw new Error("Unauthorized");
  }

  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.id, bookingId),
  });

  if (!booking || booking.clientId !== session.user.id) {
    throw new Error("Not found or unauthorized");
  }

  if (booking.status === "completed" || booking.status === "cancelled") {
    throw new Error("Cannot cancel a booking with status: " + booking.status);
  }

  await db
    .update(bookings)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(bookings.id, bookingId));

  return { success: true };
}

export async function getClientBookings() {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "client") {
    throw new Error("Unauthorized");
  }

  const clientBookings = await db.query.bookings.findMany({
    where: eq(bookings.clientId, session.user.id),
    with: {
      post: {
        with: { author: true },
      },
      review: true,
    },
    orderBy: (bookings, { desc }) => [desc(bookings.startDatetimeUtc)],
  });

  return clientBookings;
}

const getMasterBookingsSchema = z.object({
  dateFrom: z.string().datetime({ offset: true }),
  dateTo: z.string().datetime({ offset: true }),
});

export async function getMasterBookings(data: z.infer<typeof getMasterBookingsSchema>) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "master") {
    throw new Error("Unauthorized");
  }

  const validated = getMasterBookingsSchema.parse(data);

  const masterBookings = await db.query.bookings.findMany({
    where: and(
      eq(bookings.masterId, session.user.id),
      gte(bookings.startDatetimeUtc, new Date(validated.dateFrom)),
      lt(bookings.startDatetimeUtc, new Date(validated.dateTo))
    ),
    with: {
      post: true,
      client: true,
    },
    orderBy: (bookings, { asc }) => [asc(bookings.startDatetimeUtc)],
  });

  return masterBookings;
}

export async function confirmBooking(bookingId: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "master") {
    throw new Error("Unauthorized");
  }

  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.id, bookingId),
  });

  if (!booking || booking.masterId !== session.user.id) {
    throw new Error("Not found or unauthorized");
  }

  if (booking.status !== "pending") {
    throw new Error("Only pending bookings can be confirmed");
  }

  await db
    .update(bookings)
    .set({ status: "confirmed", updatedAt: new Date() })
    .where(eq(bookings.id, bookingId));

  return { success: true };
}

export async function cancelBookingByMaster(bookingId: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "master") {
    throw new Error("Unauthorized");
  }

  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.id, bookingId),
  });

  if (!booking || booking.masterId !== session.user.id) {
    throw new Error("Not found or unauthorized");
  }

  if (booking.status === "completed" || booking.status === "cancelled") {
    throw new Error("Cannot cancel a booking with status: " + booking.status);
  }

  await db
    .update(bookings)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(bookings.id, bookingId));

  return { success: true };
}

export async function getMasterCalendarData(date: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "master") {
    throw new Error("Unauthorized");
  }

  // Load master timezone to build correct UTC window
  const schedule = await db.query.masterSchedules.findFirst({
    where: eq(masterSchedules.masterId, session.user.id),
  });

  const timezone = schedule?.timezone ?? "UTC";

  // Same fix as lib/slots.ts: fromZonedTime() parses the date string's
  // numeric components directly, unlike parseISO() which anchors a bare
  // date to the *server's* system-local timezone.
  const windowStart = fromZonedTime(`${date}T00:00:00`, timezone);
  const windowEnd = fromZonedTime(`${date}T23:59:59.999`, timezone);

  const [dayBookings, dayOverrides] = await Promise.all([
    db.query.bookings.findMany({
      where: and(
        eq(bookings.masterId, session.user.id),
        ne(bookings.status, "cancelled"),
        gte(bookings.startDatetimeUtc, windowStart),
        lt(bookings.startDatetimeUtc, windowEnd)
      ),
      with: { post: true, client: true },
      orderBy: (bookings, { asc }) => [asc(bookings.startDatetimeUtc)],
    }),
    db.query.masterOverrides.findMany({
      where: and(
        eq(masterOverrides.masterId, session.user.id),
        gte(masterOverrides.startDatetimeUtc, windowStart),
        lt(masterOverrides.startDatetimeUtc, windowEnd)
      ),
      orderBy: (masterOverrides, { asc }) => [asc(masterOverrides.startDatetimeUtc)],
    }),
  ]);

  return { bookings: dayBookings, overrides: dayOverrides, timezone };
}

const submitReviewSchema = z.object({
  bookingId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

export async function submitReview(data: z.infer<typeof submitReviewSchema>) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "client") {
    throw new Error("Unauthorized");
  }

  const validated = submitReviewSchema.parse(data);

  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.id, validated.bookingId),
  });

  if (!booking || booking.clientId !== session.user.id) {
    throw new Error("Not found or unauthorized");
  }

  if (booking.status !== "completed") {
    throw new Error("You can only review a completed booking");
  }

  const existing = await db.query.reviews.findFirst({
    where: eq(reviews.bookingId, booking.id),
  });
  if (existing) {
    throw new Error("This booking has already been reviewed");
  }

  const [review] = await db
    .insert(reviews)
    .values({
      bookingId: booking.id,
      masterId: booking.masterId,
      clientId: session.user.id,
      reviewerName: session.user.name ?? "Client",
      rating: validated.rating,
      comment: validated.comment,
    })
    .returning();

  return review;
}

export async function getMasterReviews(masterId: string) {
  const masterReviews = await db.query.reviews.findMany({
    where: eq(reviews.masterId, masterId),
    orderBy: (reviews, { desc }) => [desc(reviews.createdAt)],
  });

  const count = masterReviews.length;
  const average = count > 0 ? masterReviews.reduce((sum, r) => sum + r.rating, 0) / count : null;

  return { reviews: masterReviews, average, count };
}
