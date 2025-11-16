"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from 'next-intl';
import Image from "next/image";
import FlipModal from "@/components/FlipModal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { listReferences, createOffer, type ClientReference } from "@/lib/api";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { CheckCircle } from "lucide-react";

export default function ProOrdersGallery() {
  const t = useTranslations('offers.pro');
  const tCommon = useTranslations('common');
  const sessionResult = useSession();
  const session = sessionResult?.data ?? null;
  const queryClient = useQueryClient();
  const [selectedRef, setSelectedRef] = useState<ClientReference | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    message: "",
    pricePln: "",
  });

  // Загрузить все офферы мастера
  const { data: allOffers = [], isLoading: offersLoading } = useQuery({
    queryKey: ["my-offers", session?.user?.id],
    queryFn: async () => {
      const res = await fetch("/api/offers/my");
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    },
    enabled: !!session?.user?.id,
  });

  // Загрузить все референсы
  const { data: allReferences = [], isLoading: refsLoading } = useQuery({
    queryKey: ["all-references"],
    queryFn: async () => {
      const res = await fetch("/api/references", { cache: "no-store" });
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    },
  });

  // Получить уникальные ID референсов, где есть мои офферы
  const myReferenceIds = new Set(allOffers.map((o: { refId: string }) => o.refId));
  
  // Получить полную информацию о референсах с офферами
  const myReferences = allReferences.filter((ref: ClientReference) => myReferenceIds.has(ref.id));

  // Фильтруем только открытые референсы, где есть мои офферы
  const myOpenReferences = myReferences.filter(
    (ref: ClientReference) => ref.status === "open"
  );

  // Все открытые референсы
  const allOpenReferences = allReferences.filter(
    (ref: ClientReference) => ref.status === "open"
  );

  // Новые заказы (открытые, на которые мастер еще не откликнулся)
  const newOpenReferences = allOpenReferences.filter(
    (ref: ClientReference) => !myReferenceIds.has(ref.id)
  );

  const isLoading = offersLoading || refsLoading;

  const handleOpenModal = (ref: ClientReference) => {
    setSelectedRef(ref);
    // Если есть оффер для этого референса, загружаем его данные
    const existingOffer = allOffers.find((o: { refId: string }) => o.refId === ref.id);
    if (existingOffer) {
      setFormData({
        message: existingOffer.message || "",
        pricePln: existingOffer.pricePln?.toString() || "",
      });
    } else {
      setFormData({
        message: "",
        pricePln: "",
      });
    }
  };

  // Проверяем, есть ли оффер для выбранного референса
  const selectedRefOffer = selectedRef
    ? allOffers.find((o: { refId: string }) => o.refId === selectedRef.id)
    : null;

  const handleCloseModal = () => {
    setSelectedRef(null);
  };

  const handleSubmit = async () => {
    if (!selectedRef) return;

    if (!session) {
      toast.error(t('needSignIn'));
      return;
    }

    setIsSubmitting(true);
    try {
      await createOffer({
        refId: selectedRef.id,
        message: formData.message || undefined,
        pricePln: formData.pricePln ? parseInt(formData.pricePln, 10) : undefined,
      });
      toast.success(t('sent'));
      setSelectedRef(null);
      // Обновить кэш
      await queryClient.invalidateQueries({ queryKey: ["my-offers", session?.user?.id] });
      await queryClient.invalidateQueries({ queryKey: ["all-references"] });
      await queryClient.invalidateQueries({ queryKey: ["references"] });
    } catch (error) {
      toast.error(t('error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const renderReferenceCard = (ref: ClientReference, index: number, hasOffer: boolean) => (
    <div
      key={ref.id}
      className="relative aspect-[3/4] rounded-lg overflow-hidden group cursor-pointer"
      onClick={() => handleOpenModal(ref)}
    >
      <Image
        src={ref.imageUrl}
        alt={ref.note || tCommon('order')}
        fill
        sizes="50vw"
        className="object-cover"
        priority={index < 2}
      />
      {/* Кнопка МОГУ - показываем только для новых заказов */}
      {!hasOffer && (
        <button
          className="absolute top-2 right-2 z-10 p-2 rounded-full bg-primary/90 text-primary-foreground hover:bg-primary transition-colors shadow-lg"
          onClick={(e) => {
            e.stopPropagation();
            handleOpenModal(ref);
          }}
          aria-label={t('canDo')}
        >
          <CheckCircle className="w-5 h-5 fill-current" />
        </button>
      )}
      {/* Бейдж "Мой заказ" для заказов с оффером */}
      {hasOffer && (
        <div className="absolute top-2 left-2 z-10 px-2 py-1 rounded bg-green-500/90 text-white text-xs font-medium">
          {t('myOrder')}
        </div>
      )}
      {/* Город и теги */}
      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent text-white text-xs">
        <p className="font-medium">{ref.city}</p>
        {ref.tags && ref.tags.length > 0 && (
          <p className="opacity-90">{ref.tags.slice(0, 2).join(", ")}</p>
        )}
      </div>
    </div>
  );

  return (
    <>
      <div className="space-y-6">
        {/* Новые заказы */}
        {newOpenReferences.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">{t('newOrders')}</h2>
            <div className="grid grid-cols-2 gap-2">
              {newOpenReferences.map((ref: ClientReference, index: number) =>
                renderReferenceCard(ref, index, false)
              )}
            </div>
          </div>
        )}

        {/* Пустое состояние */}
        {newOpenReferences.length === 0 && (
          <p className="text-center py-12 opacity-70">
            {t('noOpenOrders')}
          </p>
        )}
      </div>

      {selectedRef && (
        <FlipModal
          isOpen={!!selectedRef}
          onClose={handleCloseModal}
          imageUrl={selectedRef.imageUrl}
          title={selectedRefOffer ? t('myOffer') : t('title')}
          onSubmit={selectedRefOffer ? undefined : handleSubmit}
          submitLabel={tCommon('submit')}
          submitDisabled={isSubmitting}
        >
          <div className="space-y-4">
            {selectedRef.note && (
              <div>
                <label className="text-sm font-medium mb-2 block">
                  {t('orderDescription')}
                </label>
                <p className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
                  {selectedRef.note}
                </p>
              </div>
            )}

            {selectedRefOffer ? (
              // Показываем существующий оффер
              <div className="space-y-3">
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-sm font-medium text-green-900 dark:text-green-100 mb-2">
                    {t('offerSent')}
                  </p>
                  {selectedRefOffer.pricePln && (
                    <p className="text-sm text-green-800 dark:text-green-200">
                      {t('price')}: {selectedRefOffer.pricePln} PLN
                    </p>
                  )}
                  {selectedRefOffer.message && (
                    <p className="text-sm text-green-800 dark:text-green-200 mt-2">
                      {selectedRefOffer.message}
                    </p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('waitingForClient')}
                </p>
              </div>
            ) : (
              // Форма создания нового оффера
              <>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    {t('pricePln')}
                  </label>
                  <Input
                    type="number"
                    placeholder={t('priceExample')}
                    value={formData.pricePln}
                    onChange={(e) =>
                      setFormData({ ...formData, pricePln: e.target.value })
                    }
                    min="0"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    {t('description')}
                  </label>
                  <Textarea
                    placeholder={t('descriptionExample')}
                    value={formData.message}
                    onChange={(e) =>
                      setFormData({ ...formData, message: e.target.value })
                    }
                    rows={4}
                  />
                </div>
              </>
            )}
          </div>
        </FlipModal>
      )}
    </>
  );
}
