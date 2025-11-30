import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { masterProfiles, posts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { MapPin, Briefcase } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface MasterProfilePageProps {
  params: Promise<{ id: string }>;
}

export default async function MasterProfilePage({ params }: MasterProfilePageProps) {
  const { id } = await params;

  const master = await db.query.masterProfiles.findFirst({
    where: eq(masterProfiles.userId, id),
    with: {
      user: true,
    },
  });

  if (!master) {
    notFound();
  }

  const masterPosts = await db.query.posts.findMany({
    where: eq(posts.masterId, id),
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-muted/30 border-b">
        <div className="max-w-6xl mx-auto p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
              {master.businessName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{master.businessName}</h1>
              {master.bio && (
                <p className="text-muted-foreground mt-1">{master.bio}</p>
              )}
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                {master.city && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    <span>{master.city}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Briefcase className="h-4 w-4" />
                  <span>{masterPosts.length} works</span>
                </div>
              </div>
            </div>
          </div>

          {master.addressText && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(master.addressText)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
            >
              📍 {master.addressText}
            </a>
          )}
        </div>
      </div>

      {/* Portfolio Grid */}
      <div className="max-w-6xl mx-auto p-6">
        <h2 className="text-xl font-semibold mb-4">Portfolio</h2>

        {masterPosts.length === 0 ? (
          <p className="text-center py-12 text-muted-foreground">
            No works uploaded yet
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {masterPosts.map((post) => (
              <Link
                key={post.id}
                href={`/post/${post.id}?source=profile`}
                className="group relative aspect-square rounded-lg overflow-hidden bg-muted"
              >
                <Image
                  src={post.imageUrl}
                  alt={post.description || "Nail Art"}
                  fill
                  className="object-cover transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                  <div className="flex flex-wrap gap-1 mb-2">
                    {post.tags.slice(0, 3).map(({ tag }) => (
                      <Badge key={tag.id} variant="secondary" className="text-xs bg-white/20 text-white">
                        {typeof tag.nameTranslations === 'object' && tag.nameTranslations !== null
                          ? (tag.nameTranslations as { en?: string }).en || tag.slug
                          : tag.slug}
                      </Badge>
                    ))}
                  </div>
                  {post.price && (
                    <p className="text-white font-medium">{post.price} {post.currency}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
