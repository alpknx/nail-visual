import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { masterProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import ScheduleTabs from "@/components/ScheduleTabs";
import { getMasterSchedule } from "@/app/actions";

export default async function SchedulePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "master") {
    redirect("/signin");
  }

  const [profile, schedule] = await Promise.all([
    db.query.masterProfiles.findFirst({
      where: eq(masterProfiles.userId, session.user.id),
    }),
    getMasterSchedule(session.user.id),
  ]);

  if (!profile) {
    redirect("/onboarding");
  }

  const timezone = schedule?.timezone ?? "Europe/Warsaw";

  return <ScheduleTabs masterId={session.user.id} timezone={timezone} />;
}
