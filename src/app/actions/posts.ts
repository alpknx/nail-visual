"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { posts, postTags } from "@/db/schema";
import { z } from "zod";
import { redirect } from "next/navigation";
import { eq, desc, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { getLocaleFromHeaders } from "./shared";

export async function getFeedPosts({ pageParam = 0, tagIds, limit = 4 }: { pageParam?: number, tagIds?: number[], limit?: number }) {
  const LIMIT = limit; // Dynamic limit based on viewport height

  // Mock location (New York)
  const userLat = 40.7128;
  const userLng = -74.0060;

  const validatedTagIds = tagIds
    ? z.array(z.number().int().positive()).parse(tagIds)
    : undefined;

  const whereClause = validatedTagIds && validatedTagIds.length > 0
    ? sql`EXISTS (
        SELECT 1 FROM ${postTags} pt
        WHERE pt.post_id = ${posts.id}
        AND pt.tag_id = ANY(${validatedTagIds}::int[])
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

export async function getMatchingMasters(postId: string) {
  // Cache matching masters for 2 minutes (expensive computation)
  const getCachedMasters = unstable_cache(
    async (pId: string) => {
      // Get the post with its tags, and all masters with their posts, in parallel -
      // the masters query doesn't depend on the post lookup's result.
      const [post, masters] = await Promise.all([
        db.query.posts.findFirst({
          where: eq(posts.id, pId),
          with: {
            tags: {
              with: {
                tag: {

                },
              },
            },
          },
        }),
        db.query.masterProfiles.findMany({
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
        }),
      ]);

      if (!post) {
        return [];
      }

      // Mock user location (New York)
      const userLat = 40.7128;
      const userLng = -74.0060;

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
