import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { masterProfiles, posts } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || session.user.role !== "master") {
    redirect("/signin");
  }

  // Get master profile
  const profile = await db.query.masterProfiles.findFirst({
    where: eq(masterProfiles.userId, session.user.id),
  });

  if (!profile) {
    redirect("/onboarding");
  }

  // Get master's posts
  const masterPosts = await db.query.posts.findMany({
    where: eq(posts.masterId, session.user.id),
    orderBy: [desc(posts.createdAt)],
  });

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {profile.businessName}</p>
          </div>
          <Link href="/upload">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Upload
            </Button>
          </Link>
        </div>



        {/* Portfolio Grid */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">Your Portfolio</h2>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {masterPosts.map((post) => (
              <Link
                key={post.id}
                href={`/post/${post.id}`}
                className="group relative aspect-square rounded-lg overflow-hidden bg-muted"
              >
                <Image
                  src={post.imageUrl}
                  alt={post.description || "Nail Art"}
                  fill
                  className="object-cover transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                  <div className="text-white text-sm">
                    {post.price && (
                      <p className="font-medium">{post.price} {post.currency}</p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
