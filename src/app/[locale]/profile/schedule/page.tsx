import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { masterProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import ScheduleEditor from "@/components/ScheduleEditor";
import OverridesList from "@/components/OverridesList";
import { getMasterSchedule } from "@/app/actions";

export default async function SchedulePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "master") {
    redirect("/signin");
  }

  const profile = await db.query.masterProfiles.findFirst({
    where: eq(masterProfiles.userId, session.user.id),
  });

  if (!profile) {
    redirect("/onboarding");
  }

  const schedule = await getMasterSchedule(session.user.id);
  const timezone = schedule?.timezone ?? "Europe/Warsaw";

  return (
    <>
      <ScheduleEditor masterId={session.user.id} />
      <OverridesList masterId={session.user.id} timezone={timezone} />
    </>
  );
}
