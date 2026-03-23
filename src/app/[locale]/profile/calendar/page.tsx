import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getMasterSchedule } from "@/app/actions";
import BookingAgenda from "@/components/BookingAgenda";

export default async function CalendarPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "master") {
    redirect("/signin");
  }

  const schedule = await getMasterSchedule(session.user.id);
  const timezone = schedule?.timezone ?? "Europe/Warsaw";

  return <BookingAgenda masterId={session.user.id} timezone={timezone} />;
}
