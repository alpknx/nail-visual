import { notFound } from "next/navigation";
import { db } from "@/db";
import { posts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getMatchingMasters } from "@/app/actions";
import PostDetailClient from "@/components/PostDetailClient";

interface PostDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ source?: string }>;
}

export default async function PostDetailPage({ params, searchParams }: PostDetailPageProps) {
  const { id } = await params;
  const { source } = await searchParams;

  const post = await db.query.posts.findFirst({
    where: eq(posts.id, id),
    with: {
      author: true,
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
    notFound();
  }

  const matchingMasters = await getMatchingMasters(id);

  return (
    <PostDetailClient post={post} matchingMasters={matchingMasters} source={source} />
  );
}
