"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { masterProfiles, posts, postTags, tags } from "@/db/schema";
import { z } from "zod";
import { redirect } from "next/navigation";
import { eq, desc, sql } from "drizzle-orm";

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

  redirect("/dashboard");
}

export async function getFeedPosts({ pageParam = 0, tagId }: { pageParam?: number, tagId?: number }) {
  const LIMIT = 10;
  const OFFSET = pageParam * LIMIT;

  // Mock location (New York)
  const userLat = 40.7128;
  const userLng = -74.0060;

  // Fetch posts with master info
  // For MVP mixed feed, we'll just fetch latest posts for now
  // To implement the mix (2 local, 8 global), we would need more complex logic
  // Here we just fetch latest posts

  const whereClause = tagId
    ? sql`EXISTS (
        SELECT 1 FROM ${postTags} pt 
        WHERE pt.post_id = ${posts.id} 
        AND pt.tag_id = ${tagId}
      )`
    : undefined;

  const feedPosts = await db.query.posts.findMany({
    with: {
      author: true,
    },
    where: whereClause,
    limit: LIMIT,
    offset: OFFSET,
    orderBy: [desc(posts.createdAt)],
  });

  return {
    data: feedPosts,
    nextPage: feedPosts.length === LIMIT ? pageParam + 1 : undefined,
  };
}

export async function searchTags(query: string, locale: string = 'en') {
  if (!query || query.length < 2) return [];

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
  const tag = await db.query.tags.findFirst({
    where: eq(tags.id, id),
  });

  if (!tag) return null;

  return {
    id: tag.id,
    name: (tag.nameTranslations as any)[locale] || tag.slug,
    slug: tag.slug
  };
}

export async function getMatchingMasters(postId: string) {
  // Get the post with its tags
  const post = await db.query.posts.findFirst({
    where: eq(posts.id, postId),
    with: {
      tags: {
        with: {
          tag: {
            with: {
              category: true,
            },
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
                with: {
                  category: true,
                },
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
              // +3 for Design category, +2 for Shape category
              if (postTag.tag.category.slug === "design") {
                postScore += 3;
              } else if (postTag.tag.category.slug === "shape") {
                postScore += 2;
              } else {
                postScore += 1;
              }
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
    price: validated.price ? Math.round(validated.price * 100) : null, // Convert to cents
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

  redirect("/dashboard");
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

export async function trackConversionClick(masterId: string, type: 'sms' | 'call') {
  // TODO: Implement actual analytics tracking
  console.log(`[Analytics] Conversion click: ${type} for master ${masterId}`);

  // In a real implementation, we would insert into a 'conversions' table
  // await db.insert(conversions).values({ masterId, type, timestamp: new Date() });
}
