"use client";

import { useState } from "react";
import { useTranslations } from 'next-intl';
import { useRouter } from "@/i18n/routing";
import { Session } from "next-auth";
import FlipModal from "@/components/FlipModal";
import { toast } from "sonner";
import { createReference, type City, type Work } from "@/lib/api";
import { useGeolocationContext } from "@/contexts/GeolocationContext";

interface WorkFlipModalProps {
  work: Work;
  proId: string;
  proName?: string | null;
  onClose: () => void;
  session: Session | null;
}

export default function WorkFlipModal({
  work,
  proId,
  proName,
  onClose,
  session,
}: WorkFlipModalProps) {
  const t = useTranslations('masters');
  const tCommon = useTranslations('common');
  const tDesigns = useTranslations('designs');
  const router = useRouter();
  const { detectedCity } = useGeolocationContext();
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  
  // Проверяем, является ли пользователь клиентом (только клиенты могут создавать заказы)
  const userRole = session?.user?.role;
  const isClient = userRole === "client" || userRole === "admin";
  const canCreateOrder = isClient;
  // Используем detectedCity из контекста, если он есть, иначе город из работы
  const city = detectedCity || (work.city as City | undefined);

  const handleCreateOrder = async () => {
    if (!session) {
      toast.error(tCommon('needAuth') || "Необходимо войти в систему");
      router.push("/signin");
      return;
    }

    if (!city) {
      toast.error(tDesigns('selectCityFirst') || "Пожалуйста, выберите город");
      return;
    }

    setIsCreatingOrder(true);
    try {
      // Используем только описание работы, без упоминания мастера
      const note = work.caption || null;
      
      await createReference({
        imageUrl: work.imageUrl,
        note: note,
        tags: work.tags || [],
        city: city,
      });

      toast.success(tDesigns('orderCreated') || "Заказ создан! Мастера увидят ваш запрос.");
      onClose();
      router.push("/client/offers");
    } catch (error: any) {
      toast.error(error.message || tDesigns('orderError') || "Ошибка при создании заказа");
    } finally {
      setIsCreatingOrder(false);
    }
  };

  return (
    <FlipModal
      isOpen={true}
      onClose={onClose}
      imageUrl={work.imageUrl}
      title={t('masterWork') || 'Работа мастера'}
      onSubmit={canCreateOrder ? handleCreateOrder : undefined}
      submitLabel={canCreateOrder ? (tDesigns('createOrder') || "Создать заказ") : undefined}
      submitDisabled={canCreateOrder ? (isCreatingOrder || !city) : true}
    >
      <div className="space-y-4">
        {/* Информация о мастере */}
        {proName && (
          <div>
            <label className="text-sm font-medium mb-2 block">{t('master') || 'Мастер'}</label>
            <p className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
              {proName}
            </p>
          </div>
        )}

        {/* Описание работы */}
        {work.caption && (
          <div>
            <label className="text-sm font-medium mb-2 block">{tCommon('description') || 'Описание'}</label>
            <p className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
              {work.caption}
            </p>
          </div>
        )}

        {/* Теги */}
        {work.tags && work.tags.length > 0 && (
          <div>
            <label className="text-sm font-medium mb-2 block">{tCommon('tags') || 'Теги'}</label>
            <div className="flex flex-wrap gap-2">
              {work.tags.map((tag) => (
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

        {/* Информация о заказе */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <p className="text-sm font-medium">
            {city 
              ? (tDesigns('mastersInCity', { count: 1, city }) || `Мастер может сделать такие ногти в ${city}`)
              : (tDesigns('mastersAvailable', { count: 1 }) || "Мастер может сделать такие ногти")
            }
          </p>
          <p className="text-xs text-muted-foreground">
            {tDesigns('matchingDescription') || 'Отправьте заказ, и мастер сможет ответить вам.'}
          </p>
        </div>

        {!city && canCreateOrder && (
          <p className="text-xs text-muted-foreground text-center p-2 bg-muted rounded-lg">
            {tDesigns('selectCityToOrder') || "Выберите город, чтобы создать заказ"}
          </p>
        )}
        
        {!canCreateOrder && (
          <p className="text-xs text-muted-foreground text-center p-2 bg-muted rounded-lg">
            {tDesigns('onlyClientsCanOrder') || "Только клиенты могут создавать заказы"}
          </p>
        )}
      </div>
    </FlipModal>
  );
}

