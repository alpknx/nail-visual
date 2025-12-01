import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { masterProfiles, posts } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import DashboardClient from "@/components/DashboardClient";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || session.user.role !== "master") {
    redirect("/signin?callbackUrl=/profile");
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

  return <DashboardClient profile={profile} masterPosts={masterPosts} />;
}
