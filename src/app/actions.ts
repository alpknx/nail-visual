"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { masterProfiles, posts, postTags, tags } from "@/db/schema";
import { z } from "zod";
import { redirect } from "next/navigation";
import { eq, desc, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";

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

  redirect("/profile");
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

export async function getFeedPosts({ pageParam = 0, tagId, limit = 4 }: { pageParam?: number, tagId?: number, limit?: number }) {
  const LIMIT = limit; // Dynamic limit based on viewport height

  // Mock location (New York)
  const userLat = 40.7128;
  const userLng = -74.0060;

  const whereClause = tagId
    ? sql`EXISTS (
        SELECT 1 FROM ${postTags} pt 
        WHERE pt.post_id = ${posts.id} 
        AND pt.tag_id = ${tagId}
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
        price: matchingPost?.price || null,
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

  redirect("/profile");
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

  redirect("/profile");
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

  // Delete post (cascade should handle tags if configured, but let's be safe)
  await db.delete(postTags).where(eq(postTags.postId, postId));
  await db.delete(posts).where(eq(posts.id, postId));

  redirect("/profile");
}
