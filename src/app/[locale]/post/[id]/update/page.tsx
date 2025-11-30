import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { posts, tags } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect, notFound } from "next/navigation";
import UpdatePostClient from "@/components/UpdatePostClient";

interface UpdatePostPageProps {
  params: Promise<{ id: string }>;
}

export default async function UpdatePostPage({ params }: UpdatePostPageProps) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  if (!session || !session.user || session.user.role !== "master") {
    redirect("/signin");
  }

  // Fetch post with tags
  const post = await db.query.posts.findFirst({
    where: eq(posts.id, id),
    with: {
      tags: {
        with: {
          tag: true,
        },
      },
    },
  });

  if (!post) {
    notFound();
  }

  // Verify ownership
  if (post.masterId !== session.user.id) {
    redirect("/dashboard");
  }

  // Fetch all tags for selection
  const allTags = await db.query.tags.findMany({
    with: {
      category: true,
    },
    orderBy: (tags, { asc }) => [asc(tags.slug)],
  });

  return <UpdatePostClient post={post} allTags={allTags} />;
}
