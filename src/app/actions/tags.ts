"use server";

import { db } from "@/db";
import { tags } from "@/db/schema";
import { sql, eq } from "drizzle-orm";
import { unstable_cache } from "next/cache";

export async function searchTags(query: string, locale: string = 'en') {
  if (!query || query.length < 2) return [];

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
