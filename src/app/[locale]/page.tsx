"use client";

import { useSession } from "next-auth/react";
import { useTranslations } from 'next-intl';
import ClientReferenceGallery from "@/components/ClientReferenceGallery";
import ProOrdersGallery from "@/components/ProOrdersGallery";
import WorkGrid from "@/components/WorkGrid";

export default function Home() {
  const t = useTranslations('home');
  const { data: session } = useSession();
  const role = session?.user?.role;

  return (
    <main className="min-h-screen pb-4">
      {role === "pro" ? (
        <div className="space-y-4">
          <div className="px-4 pt-16 md:pt-4">
            <h1 className="text-2xl font-semibold mb-2">{t('pro.title')}</h1>
            <p className="text-sm text-muted-foreground">
              {t('pro.subtitle')}
            </p>
          </div>
          <ProOrdersGallery />
        </div>
      ) : role === "client" ? (
        <div className="space-y-4">
          <div className="px-4 pt-16 md:pt-4">
            <h1 className="text-2xl font-semibold mb-2">{t('client.title')}</h1>
            <p className="text-sm text-muted-foreground">
              {t('client.subtitle')}
            </p>
          </div>
          <ClientReferenceGallery />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="px-4 pt-16 md:pt-4">
            <h1 className="text-2xl font-semibold mb-2">{t('guest.title')}</h1>
            <p className="text-sm text-muted-foreground">
              {t('guest.subtitle')}
            </p>
          </div>
          <WorkGrid />
        </div>
      )}
    </main>
  );
}

