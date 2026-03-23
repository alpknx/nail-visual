"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { masterProfiles, posts, postTags, tags, masterSchedules, scheduleRanges, masterOverrides, bookings } from "@/db/schema";
import { z } from "zod";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { eq, desc, sql, inArray, and, gt, lt, ne, gte } from "drizzle-orm";
import { getAvailableSlots } from "@/lib/slots";
import { addMinutes, startOfDay, endOfDay, parseISO } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { unstable_cache } from "next/cache";

// Helper function to get locale from headers
async function getLocaleFromHeaders(): Promise<string> {
  const headersList = await headers();
  const referer = headersList.get("referer") || "";
  // Extract locale from referer URL (e.g., http://localhost:3000/en/onboarding -> en)
  const localeMatch = referer.match(/\/(en|pl|ru)(?:\/|$)/);
  return localeMatch ? localeMatch[1] : "en";
}

const onboardingSchema = z.object({
  businessName: z.string().min(1, "Business Name is required"),
  phoneNumber: z.string().min(1, "Phone Number is required"),
  addressText: z.string().optional(),
  city: z.string().optional(),
});

export async function completeOnboarding(formData: z.infer<typeof onboardingSchema>) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || session.user.role !== "master") {
    throw new Error("Unauthorized");
  }

  const validated = onboardingSchema.parse(formData);

  await db.insert(masterProfiles).values({
    userId: session.user.id,
    businessName: validated.businessName,
    phoneNumber: validated.phoneNumber,
    addressText: validated.addressText,
    city: validated.city,
  }).onConflictDoUpdate({
    target: masterProfiles.userId,
    set: {
      businessName: validated.businessName,
      phoneNumber: validated.phoneNumber,
      addressText: validated.addressText,
      city: validated.city,
      updatedAt: new Date(),
    }
  });

  // Get locale from headers to preserve it in redirect
  const locale = await getLocaleFromHeaders();
  redirect(`/${locale}/profile`);
}

export async function getProfile() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return null;
  }

  const profile = await db.query.masterProfiles.findFirst({
    where: eq(masterProfiles.userId, session.user.id),
  });

  return profile;
}

const updateProfileSchema = z.object({
  businessName: z.string().min(1, "Business Name is required"),
  phoneNumber: z.string().min(1, "Phone Number is required"),
  addressText: z.string().optional(),
  city: z.string().optional(),
  bio: z.string().optional(),
});

export async function updateProfile(data: z.infer<typeof updateProfileSchema>) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || session.user.role !== "master") {
    throw new Error("Unauthorized");
  }

  const validated = updateProfileSchema.parse(data);

  await db.update(masterProfiles)
    .set({
      businessName: validated.businessName,
      phoneNumber: validated.phoneNumber,
      addressText: validated.addressText,
      city: validated.city,
      bio: validated.bio,
      updatedAt: new Date(),
    })
    .where(eq(masterProfiles.userId, session.user.id));

  return { success: true };
}

export async function getFeedPosts({ pageParam = 0, tagIds, limit = 4 }: { pageParam?: number, tagIds?: number[], limit?: number }) {
  const LIMIT = limit; // Dynamic limit based on viewport height

  // Mock location (New York)
  const userLat = 40.7128;
  const userLng = -74.0060;

  const whereClause = tagIds && tagIds.length > 0
    ? sql`EXISTS (
        SELECT 1 FROM ${postTags} pt 
        WHERE pt.post_id = ${posts.id} 
        AND pt.tag_id = ANY(${sql.raw(`ARRAY[${tagIds.map(id => id.toString()).join(',')}]`)})
      )`
    : undefined;

  // Load a much larger batch to ensure diversity across masters
  // We need enough posts to have variety from different masters
  const batchSize = Math.max(LIMIT * 10, 50); // Load 10x what we need for good master diversity
  
  const feedPosts = await db.query.posts.findMany({
    with: {
      author: true,
    },
    where: whereClause,
    limit: batchSize,
    offset: 0,
    orderBy: [desc(posts.createdAt)], // Fast ordering
  });
  
  // Group posts by master to ensure diversity
  const postsByMaster = new Map<string, typeof feedPosts>();
  for (const post of feedPosts) {
    const masterId = post.masterId || 'unknown';
    if (!postsByMaster.has(masterId)) {
      postsByMaster.set(masterId, []);
    }
    postsByMaster.get(masterId)!.push(post);
  }

  // Interleave posts from different masters to ensure diversity
  const interleaved: typeof feedPosts = [];
  const masterArrays = Array.from(postsByMaster.values());
  
  // Shuffle each master's posts array for randomness
  masterArrays.forEach(masterPosts => {
    masterPosts.sort(() => Math.random() - 0.5);
  });
  
  // Shuffle the order of masters for randomness
  masterArrays.sort(() => Math.random() - 0.5);
  
  // Interleave: take one post from each master in round-robin fashion
  let maxLength = Math.max(...masterArrays.map(arr => arr.length));
  for (let i = 0; i < maxLength; i++) {
    for (const masterPosts of masterArrays) {
      if (masterPosts[i]) {
        interleaved.push(masterPosts[i]);
      }
    }
  }
  
  // Paginate from interleaved results
  const OFFSET = pageParam * LIMIT;
  const paginatedPosts = interleaved.slice(OFFSET, OFFSET + LIMIT);
  const hasMore = interleaved.length > OFFSET + LIMIT;

  return {
    data: paginatedPosts,
    nextPage: hasMore ? pageParam + 1 : undefined,
  };
}

export async function searchTags(query: string, locale: string = 'en') {
  if (!query || query.length < 2) return [];

  // Cache search results for 1 minute to reduce DB load
  const getCachedTags = unstable_cache(
    async (searchQuery: string, searchLocale: string) => {
      const matchingTags = await db.query.tags.findMany({
        where: sql`
          ${tags.slug} ILIKE ${`%${searchQuery}%`} OR
          ${tags.nameTranslations}->>${searchLocale} ILIKE ${`%${searchQuery}%`}
        `,
        limit: 10,
      });

      return matchingTags.map(tag => ({
        id: tag.id,
        name: (tag.nameTranslations as any)[searchLocale] || tag.slug,
        slug: tag.slug
      }));
    },
    ['search-tags'],
    {
      revalidate: 60, // 1 minute
      tags: ['tags', `tags-${locale}`],
    }
  );

  // Note: We don't cache by query to allow fresh search results
  // But we can still benefit from DB query optimization
  const matchingTags = await db.query.tags.findMany({
    where: sql`
      ${tags.slug} ILIKE ${`%${query}%`} OR
      ${tags.nameTranslations}->>${locale} ILIKE ${`%${query}%`}
    `,
    limit: 10,
  });

  return matchingTags.map(tag => ({
    id: tag.id,
    name: (tag.nameTranslations as any)[locale] || tag.slug,
    slug: tag.slug
  }));
}

export async function getTagById(id: number, locale: string = 'en') {
  // Cache tag data for 5 minutes (tags are relatively static)
  const getCachedTag = unstable_cache(
    async (tagId: number, tagLocale: string) => {
      const tag = await db.query.tags.findFirst({
        where: eq(tags.id, tagId),
      });

      if (!tag) return null;

      return {
        id: tag.id,
        name: (tag.nameTranslations as any)[tagLocale] || tag.slug,
        slug: tag.slug
      };
    },
    [`tag-${id}-${locale}`],
    {
      revalidate: 300, // 5 minutes
      tags: ['tags', `tag-${id}`],
    }
  );

  return getCachedTag(id, locale);
}

export async function getMatchingMasters(postId: string) {
  // Cache matching masters for 2 minutes (expensive computation)
  const getCachedMasters = unstable_cache(
    async (pId: string) => {
      // Get the post with its tags
      const post = await db.query.posts.findFirst({
        where: eq(posts.id, pId),
    with: {
      tags: {
        with: {
          tag: {

          },
        },
      },
    },
  });

  if (!post) {
    return [];
  }

  // Mock user location (New York)
  const userLat = 40.7128;
  const userLng = -74.0060;

  // Get all masters with their posts
  const masters = await db.query.masterProfiles.findMany({
    with: {
      posts: {
        with: {
          tags: {
            with: {
              tag: {

              },
            },
          },
        },
      },
    },
  });

  // Score each master
  const scoredMasters = masters
    .map((master) => {
      let score = 0;
      let matchingPost = null;
      let bestScore = 0;

      // Check each of master's posts
      for (const masterPost of master.posts) {
        let postScore = 0;

        // Check tag matches
        for (const postTag of post.tags) {
          for (const masterTag of masterPost.tags) {
            if (postTag.tag.id === masterTag.tag.id) {
              // Simple match count
              postScore += 1;
            }
          }
        }

        if (postScore > bestScore) {
          bestScore = postScore;
          matchingPost = masterPost;
        }
      }

      score = bestScore;

      // Mock distance calculation (would use PostGIS in production)
      const distance = Math.random() * 10; // Random distance 0-10km for MVP

      return {
        masterId: master.userId,
        businessName: master.businessName,
        phoneNumber: master.phoneNumber,
        phoneCountryCode: master.phoneCountryCode,
        avatarUrl: master.avatarUrl,
        score,
        distance,
        matchingImageUrl: matchingPost?.imageUrl || null,
        matchingPostId: matchingPost?.id || null,
        price: matchingPost?.price || null,
        currency: matchingPost?.currency || null,
        durationMinutes: matchingPost?.durationMinutes || null,
      };
    })
    .filter((m) => m.score > 0) // Only show masters with at least some match
    .sort((a, b) => {
      // Sort by score first, then by distance
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.distance - b.distance;
    })
    .slice(0, 10); // Top 10

      return scoredMasters;
    },
    [`matching-masters-${postId}`],
    {
      revalidate: 120, // 2 minutes
      tags: ['masters', `post-${postId}`],
    }
  );

  return getCachedMasters(postId);
}

const createPostSchema = z.object({
  imageUrl: z.string().url(),
  description: z.string().optional(),
  price: z.number().optional(),
  durationMinutes: z.number().optional(),
  tagIds: z.array(z.number()),
});

export async function createPost(data: z.infer<typeof createPostSchema>) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || session.user.role !== "master") {
    throw new Error("Unauthorized");
  }

  const validated = createPostSchema.parse(data);

  // 1. Create Post
  const [newPost] = await db.insert(posts).values({
    masterId: session.user.id,
    imageUrl: validated.imageUrl,
    description: validated.description,
    price: validated.price ? Math.round(validated.price) : null,
    currency: "PLN", // Default for now
    durationMinutes: validated.durationMinutes,
  }).returning();

  // 2. Link Tags
  if (validated.tagIds.length > 0) {
    await db.insert(postTags).values(
      validated.tagIds.map((tagId) => ({
        postId: newPost.id,
        tagId: tagId,
      }))
    );
  }

  const locale = await getLocaleFromHeaders();
  redirect(`/${locale}/profile`);
}

export async function getTags() {
  const allTags = await db.query.tags.findMany({
    with: {
      category: true,
    },
    orderBy: (tags, { asc }) => [asc(tags.slug)],
  });
  return allTags;
}

export async function getAllTags(locale: string = 'en') {
  // Cache all tags for 5 minutes (tags are relatively static)
  const getCachedTags = unstable_cache(
    async (tagLocale: string) => {
      const allTags = await db.query.tags.findMany({
        with: {
          category: true,
        },
        orderBy: (tags, { asc }) => [asc(tags.slug)],
      });

      return allTags.map(tag => ({
        id: tag.id,
        name: (tag.nameTranslations as any)[tagLocale] || tag.slug,
        slug: tag.slug,
        categoryId: tag.categoryId,
      }));
    },
    ['all-tags', locale],
    {
      revalidate: 300, // 5 minutes
      tags: ['tags', `tags-${locale}`],
    }
  );

  return getCachedTags(locale);
}

const updatePostDetailsSchema = z.object({
  postId: z.string(),
  tagIds: z.array(z.number()),
  price: z.number().optional(),
  durationMinutes: z.number().optional(),
});

export async function updatePostDetails(data: z.infer<typeof updatePostDetailsSchema>) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || session.user.role !== "master") {
    throw new Error("Unauthorized");
  }

  const validated = updatePostDetailsSchema.parse(data);

  // Verify ownership
  const post = await db.query.posts.findFirst({
    where: eq(posts.id, validated.postId),
  });

  if (!post || post.masterId !== session.user.id) {
    throw new Error("Unauthorized or Post not found");
  }

  // Update post details
  await db.update(posts)
    .set({
      price: validated.price ? Math.round(validated.price) : null,
      durationMinutes: validated.durationMinutes,
    })
    .where(eq(posts.id, validated.postId));

  // Delete existing tags
  await db.delete(postTags).where(eq(postTags.postId, validated.postId));

  // Insert new tags
  if (validated.tagIds.length > 0) {
    await db.insert(postTags).values(
      validated.tagIds.map((tagId) => ({
        postId: validated.postId,
        tagId: tagId,
      }))
    );
  }

  const locale = await getLocaleFromHeaders();
  redirect(`/${locale}/profile`);
}

export async function deletePost(postId: string) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || session.user.role !== "master") {
    throw new Error("Unauthorized");
  }

  // Verify ownership
  const post = await db.query.posts.findFirst({
    where: eq(posts.id, postId),
  });

  if (!post || post.masterId !== session.user.id) {
    throw new Error("Unauthorized or Post not found");
  }

  try {
    // Delete post (cascade should handle tags if configured, but let's be safe)
    await db.delete(postTags).where(eq(postTags.postId, postId));
    await db.delete(posts).where(eq(posts.id, postId));

    // Return success instead of redirecting (let client handle redirect)
    return { success: true };
  } catch (error) {
    console.error("Error deleting post:", error);
    throw new Error("Failed to delete post. Please try again.");
  }
}

// ==========================================
// SCHEDULE ACTIONS
// ==========================================

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

// ==========================================
// BOOKING ACTIONS (CLIENT)
// ==========================================

export async function getAvailableSlotsAction(
  masterId: string,
  postId: string,
  date: string // "YYYY-MM-DD" in master's timezone
) {
  return getAvailableSlots(masterId, postId, date);
}

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

  // Verify the slot is still free
  const slots = await getAvailableSlots(masterId, postId, datetimeUtc.slice(0, 10));
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

const createBookingSchema = z.object({
  masterId: z.string().uuid(),
  postId: z.string().uuid(),
  datetimeUtc: z.string().datetime({ offset: true }),
  notes: z.string().max(500).optional(),
});

export async function createBooking(data: z.infer<typeof createBookingSchema>) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "client") {
    throw new Error("Unauthorized — only clients can book");
  }

  const validated = createBookingSchema.parse(data);

  const post = await db.query.posts.findFirst({
    where: eq(posts.id, validated.postId),
  });

  if (!post?.durationMinutes || post.masterId !== validated.masterId) {
    throw new Error("Post not found or invalid");
  }

  const start = new Date(validated.datetimeUtc);
  const end = addMinutes(start, post.durationMinutes);

  // Race condition check: verify slot is still free
  const slots = await getAvailableSlots(
    validated.masterId,
    validated.postId,
    validated.datetimeUtc.slice(0, 10)
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
      clientId: session.user.id,
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
    },
    orderBy: (bookings, { desc }) => [desc(bookings.startDatetimeUtc)],
  });

  return clientBookings;
}

// ==========================================
// BOOKING ACTIONS (MASTER)
// ==========================================

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

  const localDay = toZonedTime(parseISO(date), timezone);
  const windowStart = fromZonedTime(startOfDay(localDay), timezone);
  const windowEnd   = fromZonedTime(endOfDay(localDay), timezone);

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