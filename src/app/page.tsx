"use client";

import { useSession } from "next-auth/react";
import { Suspense } from "react";
import WorkGrid from "@/components/WorkGrid";
import ReferencesList from "@/components/ReferencesList";
import ClientDashboard from "@/components/ClientDashboard";

export default function Home() {
  const { data: session } = useSession();
  const role = session?.user?.role;

  return (
    <section className="space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold">Nail Visual</h1>
          <p className="text-muted-foreground">
            {role === "pro"
              ? "Найди референсы для маникюра и отправляй офферы"
              : role === "client"
              ? "Твои референсы и офферы от мастеров"
              : "Залей работу или найди мастера по стилю"}
          </p>
        </div>
      
      </div>

      {role === "pro" ? (
        <>
          <h2 className="text-lg font-semibold">Свежие референсы</h2>
          <ReferencesList />
        </>
      ) : role === "client" ? (
        <>
          <Suspense fallback={<div className="h-64 rounded-xl border animate-pulse" />}>
            <ClientDashboard />
          </Suspense>
          <div className="mt-8 pt-8 border-t">
            <h2 className="text-lg font-semibold mb-4">Портфолио мастеров</h2>
            <WorkGrid />
          </div>
        </>
      ) : (
        <>
          <h2 className="text-lg font-semibold">Портфолио мастеров</h2>
          <WorkGrid />
        </>
      )}
    </section>
  );
}
