"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from 'next-intl';
import { useRouter } from "@/i18n/routing";
import { Session } from "next-auth";
import FlipModal from "@/components/FlipModal";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { createReference, type City } from "@/lib/api";
import type { Design } from "@/app/[locale]/designs/page";
import { Heart, Search } from "lucide-react";
import { addFavoriteToStorage, removeFavoriteFromStorage, getFavoritesFromStorage } from "@/lib/localStorageFavorites";
import Image from "next/image";

interface DesignFlipModalProps {
  design: Design;
  city?: City;
  onClose: () => void;
  session: Session | null;
  onSelectSimilar?: (design: Design) => void; // Callback для открытия похожего дизайна
}

export default function DesignFlipModal({
  design,
  city,
  onClose,
  session,
  onSelectSimilar,
}: DesignFlipModalProps) {
  const t = useTranslations('designs');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  
  // Проверяем, является ли пользователь клиентом (только клиенты могут создавать заказы)
  const userRole = session?.user?.role;
  const isClient = userRole === "client" || userRole === "admin";
  const canCreateOrder = isClient;

  // Проверяем, сохранен ли дизайн
  const [isSaved, setIsSaved] = useState(() => {
    if (typeof window === "undefined") return false;
    const favorites = getFavoritesFromStorage();
    return favorites.includes(design.id);
  });

  const handleFindMasters = () => {
    if (city) {
      router.push(`/pros?city=${encodeURIComponent(city)}`);
      onClose();
    } else {
      router.push("/pros");
      onClose();
    }
  };

  // Загружаем похожие дизайны (случайные, исключая текущий)
  const { data: similarDesigns = [] } = useQuery<Design[]>({
    queryKey: ["similar-designs", design.id],
    queryFn: async () => {
      const res = await fetch(`/api/designs?limit=20&offset=0`);
      if (!res.ok) return [];
      const json = await res.json();
      const allDesigns = json.data || [];
      // Исключаем текущий дизайн и берем первые 10
      return allDesigns.filter((d: Design) => d.id !== design.id).slice(0, 10);
    },
    enabled: !!design.id,
  });

  const handleSave = () => {
    if (isSaved) {
      removeFavoriteFromStorage(design.id);
      setIsSaved(false);
      toast.success(t('removedFromSaved') || "Удалено из сохраненных");
    } else {
      addFavoriteToStorage(design.id);
      setIsSaved(true);
      toast.success(t('saved') || "Сохранено");
    }
  };

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
        {/* Кнопки Save и Find masters */}
        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            variant={isSaved ? "default" : "outline"}
            size="lg"
            className="flex-1"
          >
            <Heart className={`w-4 h-4 mr-2 ${isSaved ? "fill-current" : ""}`} />
            {isSaved ? (t('saved') || "Сохранено") : (t('save') || "Сохранить")}
          </Button>
          <Button
            onClick={handleFindMasters}
            variant="default"
            size="lg"
            className="flex-1"
          >
            <Search className="w-4 h-4 mr-2" />
            {t('findMasters') || "Найти мастеров"}
          </Button>
        </div>

        {!city && canCreateOrder && (
          <p className="text-xs text-muted-foreground text-center p-2 bg-muted rounded-lg">
            {t('selectCityToOrder') || "Выберите город, чтобы создать заказ"}
          </p>
        )}

        {/* Similar designs - горизонтальный скролл */}
        {similarDesigns.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">{t('similarDesigns') || "Похожие дизайны"}</h3>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-6 px-6 scrollbar-hide">
              {similarDesigns.map((similarDesign) => (
                <button
                  key={similarDesign.id}
                  onClick={() => {
                    if (onSelectSimilar) {
                      onSelectSimilar(similarDesign);
                    }
                  }}
                  className="relative flex-shrink-0 w-24 h-32 rounded-lg overflow-hidden border hover:border-foreground transition-colors"
                >
                  <Image
                    src={similarDesign.imageUrl}
                    alt={similarDesign.description || "Similar design"}
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </FlipModal>
  );
}

