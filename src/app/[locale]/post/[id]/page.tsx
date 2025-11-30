import { notFound } from "next/navigation";
import { db } from "@/db";
import { posts } from "@/db/schema";
import { eq } from "drizzle-orm";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, MapPin, Clock, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMatchingMasters } from "@/app/actions";
import MatchingMastersList from "@/components/MatchingMastersList";

interface PostDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function PostDetailPage({ params }: PostDetailPageProps) {
  const { id } = await params;

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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b p-4">
        <Link href="/">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
      </div>

      {/* Hero Image - 70% */}
      <div className="relative h-[70vh] bg-muted">
        <Image
          src={post.imageUrl}
          alt={post.description || "Nail Art"}
          fill
          className="object-contain"
          priority
        />

        {/* Tags Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex flex-wrap gap-2">
            {post.tags.map(({ tag }) => (
              <span
                key={tag.id}
                className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-white text-xs font-medium"
              >
                {typeof tag.nameTranslations === 'object' && tag.nameTranslations !== null
                  ? (tag.nameTranslations as { en?: string }).en || tag.slug
                  : tag.slug}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* The Match Widget - Sticky Bottom 30% */}
      <div className="sticky bottom-0 bg-background border-t p-4 space-y-4">
        <div>
          <h2 className="text-lg font-semibold mb-1">Find Masters Who Can Do This</h2>
          <p className="text-sm text-muted-foreground">
            Local masters with similar work
          </p>
        </div>

        {/* Matching Masters Carousel */}
        <div className="overflow-x-auto pb-2 no-scrollbar">
          <div className="flex gap-3">
            <MatchingMastersList matches={matchingMasters} />
          </div>
        </div>
      </div>
    </div>
  );
}
