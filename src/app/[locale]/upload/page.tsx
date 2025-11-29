import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTags } from "@/app/actions";
import { UploadForm } from "@/components/UploadForm";

export default async function UploadPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || session.user.role !== "master") {
    redirect("/api/auth/signin");
  }

  const tags = await getTags();

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <UploadForm tags={tags as any} />
    </div>
  );
}
