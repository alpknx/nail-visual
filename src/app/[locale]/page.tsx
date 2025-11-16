"use client";

import { useSession } from "next-auth/react";
import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import ClientReferenceGallery from "@/components/ClientReferenceGallery";
import ProOrdersGallery from "@/components/ProOrdersGallery";
import WorkGrid from "@/components/WorkGrid";

// Сохраняем роль в sessionStorage для сохранения при переключении языка
const ROLE_STORAGE_KEY = 'user_role';

export default function Home() {
  const t = useTranslations('home');
  const { data: session, status } = useSession();
  
  // Инициализируем роль только из сессии (для SSR совместимости)
  const [role, setRole] = useState<string | undefined>(session?.user?.role);
  const [isHydrated, setIsHydrated] = useState(false);
  
  // После гидратации восстанавливаем роль из sessionStorage
  useEffect(() => {
    setIsHydrated(true);
    if (typeof window !== 'undefined') {
      const storedRole = sessionStorage.getItem(ROLE_STORAGE_KEY);
      if (storedRole) {
        setRole(storedRole);
      }
    }
  }, []);
  
  // Сохраняем роль при изменении сессии
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role) {
      const newRole = session.user.role;
      setRole(newRole);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(ROLE_STORAGE_KEY, newRole);
      }
    } else if (status === 'unauthenticated') {
      setRole(undefined);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(ROLE_STORAGE_KEY);
      }
    } else if (status === 'loading' && isHydrated && typeof window !== 'undefined') {
      // Во время загрузки используем сохраненную роль только после гидратации
      const storedRole = sessionStorage.getItem(ROLE_STORAGE_KEY);
      if (storedRole) {
        setRole(storedRole);
      }
    }
  }, [session, status, isHydrated]);

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

