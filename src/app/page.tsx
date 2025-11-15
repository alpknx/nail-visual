"use client";

import { useSession } from "next-auth/react";
import ClientReferenceGallery from "@/components/ClientReferenceGallery";
import ProOrdersGallery from "@/components/ProOrdersGallery";
import WorkGrid from "@/components/WorkGrid";

export default function Home() {
  const { data: session } = useSession();
  const role = session?.user?.role;

  return (
    <main className="min-h-screen pb-4">
      {role === "pro" ? (
        <div className="space-y-4">
          <div className="px-4 pt-16 md:pt-4">
            <h1 className="text-2xl font-semibold mb-2">Заказы клиентов</h1>
            <p className="text-sm text-muted-foreground">
              Найди референсы для маникюра и отправляй офферы
            </p>
          </div>
          <ProOrdersGallery />
        </div>
      ) : role === "client" ? (
        <div className="space-y-4">
          <div className="px-4 pt-16 md:pt-4">
            <h1 className="text-2xl font-semibold mb-2">Галерея референсов</h1>
            <p className="text-sm text-muted-foreground">
              Выбери понравившийся референс и отправь заказ
            </p>
          </div>
          <ClientReferenceGallery />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="px-4 pt-16 md:pt-4">
            <h1 className="text-2xl font-semibold mb-2">Портфолио мастеров</h1>
            <p className="text-sm text-muted-foreground">
              Залей работу или найди мастера по стилю
            </p>
          </div>
          <WorkGrid />
        </div>
      )}
    </main>
  );
}
