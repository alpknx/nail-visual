"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useTranslations } from 'next-intl';
import { useRouter } from "@/i18n/routing";
import Image from "next/image";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { createReference, type City } from "@/lib/api";
import type { Design } from "@/app/[locale]/designs/page";

interface DesignModalProps {
  design: Design;
  city?: City;
  onClose: () => void;
}

export default function DesignModal({ design, city, onClose }: DesignModalProps) {
  const t = useTranslations('designs');
  const tCommon = useTranslations('common');
  const { data: session } = useSession();
  const router = useRouter();
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);

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
  });

  const matchingCount = matchingData?.count || 0;
  const matchingPros = matchingData?.data || [];

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
      // Создаем референс на основе дизайна
      await createReference({
        imageUrl: design.imageUrl,
        note: design.description || null,
        tags: design.tags as any,
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
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('designDetails') || 'Детали дизайна'}</DialogTitle>
          <DialogDescription>
            {t('findMasters') || 'Найдите мастеров, которые могут сделать такой дизайн'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Изображение дизайна */}
          <div className="relative aspect-[3/4] rounded-lg overflow-hidden border">
            <Image
              src={design.imageUrl}
              alt={design.description || "Nail design"}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>

          {/* Описание и теги */}
          {design.description && (
            <div>
              <p className="text-sm text-muted-foreground">{design.description}</p>
            </div>
          )}

          {design.tags && design.tags.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">{tCommon('tags') || 'Теги'}:</p>
              <div className="flex flex-wrap gap-2">
                {design.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 bg-muted rounded-md text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
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
            ) : (
              <p className="text-sm text-muted-foreground">
                {city
                  ? t('noMastersInCity', { city }) || `Пока нет мастеров, которые делают такой дизайн в ${city}`
                  : t('noMasters') || "Пока нет мастеров, которые делают такой дизайн"
                }
              </p>
            )}
          </div>

          {/* Кнопка создания заказа */}
          <div className="flex gap-2">
            <Button
              onClick={handleCreateOrder}
              disabled={isCreatingOrder || !city || matchingCount === 0}
              className="flex-1"
            >
              {isCreatingOrder
                ? tCommon('sending') || "Отправка..."
                : t('createOrder') || "Создать заказ"
              }
            </Button>
            <Button variant="outline" onClick={onClose}>
              {tCommon('close') || "Закрыть"}
            </Button>
          </div>

          {!city && (
            <p className="text-xs text-muted-foreground text-center">
              {t('selectCityToOrder') || "Выберите город, чтобы создать заказ"}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

