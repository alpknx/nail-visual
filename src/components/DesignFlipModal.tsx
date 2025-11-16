"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from 'next-intl';
import { useRouter } from "@/i18n/routing";
import { Session } from "next-auth";
import FlipModal from "@/components/FlipModal";
import { toast } from "sonner";
import { createReference, type City } from "@/lib/api";
import type { Design } from "@/app/[locale]/designs/page";

interface DesignFlipModalProps {
  design: Design;
  city?: City;
  onClose: () => void;
  session: Session | null;
}

export default function DesignFlipModal({
  design,
  city,
  onClose,
  session,
}: DesignFlipModalProps) {
  const t = useTranslations('designs');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  
  // Проверяем, является ли пользователь клиентом (только клиенты могут создавать заказы)
  const userRole = session?.user?.role;
  const isClient = userRole === "client" || userRole === "admin";
  const canCreateOrder = isClient;

  // Загружаем matching мастеров
  const { data: matchingData, isLoading: matchingLoading } = useQuery({
    queryKey: ["design-matching", design.id, city],
    queryFn: async () => {
      const url = new URL(`/api/designs/${design.id}/matching`, window.location.origin);
      if (city) {
        url.searchParams.set("city", city);
      }
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("Failed to fetch matching");
      return res.json();
    },
    enabled: !!design.id,
  });

  const matchingCount = matchingData?.count || 0;

  const handleCreateOrder = async () => {
    if (!session) {
      toast.error(tCommon('needAuth') || "Необходимо войти в систему");
      router.push("/signin");
      return;
    }

    if (!city) {
      toast.error(t('selectCityFirst') || "Пожалуйста, выберите город");
      return;
    }

    setIsCreatingOrder(true);
    try {
      await createReference({
        imageUrl: design.imageUrl,
        note: design.description || null,
        tags: [],
        city: city,
      });

      toast.success(t('orderCreated') || "Заказ создан! Мастера увидят ваш запрос.");
      onClose();
      router.push("/client/offers");
    } catch (error: any) {
      toast.error(error.message || t('orderError') || "Ошибка при создании заказа");
    } finally {
      setIsCreatingOrder(false);
    }
  };

  return (
    <FlipModal
      isOpen={true}
      onClose={onClose}
      imageUrl={design.imageUrl}
      title={t('designDetails') || 'Детали дизайна'}
      onSubmit={canCreateOrder ? handleCreateOrder : undefined}
      submitLabel={canCreateOrder ? (t('createOrder') || "Создать заказ") : undefined}
      submitDisabled={canCreateOrder ? (isCreatingOrder || !city) : true}
    >
      <div className="space-y-4">
        {/* Описание и теги */}
        {design.description && (
          <div>
            <label className="text-sm font-medium mb-2 block">{tCommon('description') || 'Описание'}</label>
            <p className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
              {design.description}
            </p>
          </div>
        )}

        {/* Matching информация */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          {matchingLoading ? (
            <p className="text-sm text-muted-foreground">{t('loadingMatching') || 'Поиск мастеров...'}</p>
          ) : matchingCount > 0 ? (
            <>
              <p className="text-sm font-medium">
                {city 
                  ? t('mastersInCity', { count: matchingCount, city }) || `${matchingCount} мастеров могут сделать такие ногти в ${city}`
                  : t('mastersAvailable', { count: matchingCount }) || `${matchingCount} мастеров могут сделать такие ногти`
                }
              </p>
              <p className="text-xs text-muted-foreground">
                {t('matchingDescription') || 'Мастера найдены по совпадению тегов. Отправьте заказ, и они смогут ответить вам.'}
              </p>
            </>
          ) : city ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {t('noMastersInCity', { city }) || `Пока нет мастеров, которые делают такой дизайн в ${city}`}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('canStillOrder') || "Вы все равно можете создать заказ. Мастера увидят ваш запрос и смогут ответить."}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t('noMasters') || "Пока нет мастеров, которые делают такой дизайн"}
            </p>
          )}
        </div>

        {!city && canCreateOrder && (
          <p className="text-xs text-muted-foreground text-center p-2 bg-muted rounded-lg">
            {t('selectCityToOrder') || "Выберите город, чтобы создать заказ"}
          </p>
        )}
        
        {!canCreateOrder && (
          <p className="text-xs text-muted-foreground text-center p-2 bg-muted rounded-lg">
            {t('onlyClientsCanOrder') || "Только клиенты могут создавать заказы"}
          </p>
        )}
      </div>
    </FlipModal>
  );
}

