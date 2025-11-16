"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from 'next-intl';
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import FlipModal from "@/components/FlipModal";
import { listOffersByReference, patchOfferStatus, type Offer, type ClientReference } from "@/lib/api";

export default function ClientOffersPage() {
  const t = useTranslations('offers.client');
  const tCommon = useTranslations('common');
  const { data: session } = useSession();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | "open" | "matches">("all");
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [selectedMatchedRef, setSelectedMatchedRef] = useState<ClientReference | null>(null);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  // Загрузить все референсы клиента
  const { data: myReferences = [], isLoading: refsLoading } = useQuery({
    queryKey: ["my-references", session?.user?.id],
    queryFn: async () => {
      const res = await fetch("/api/references");
      if (!res.ok) return [];
      const json = await res.json();
      return (json.data || []).filter(
        (ref: ClientReference) => ref.clientId === session?.user?.id
      );
    },
    enabled: !!session?.user?.id,
  });

  const references = myReferences || [];
  
  // Открытые референсы и мэтчи вычисляются через useMemo для автоматического пересчета
  const openReferences = useMemo(() => 
    references.filter((r: ClientReference) => r.status === "open"),
    [references]
  );
  const matchedReferences = useMemo(() => 
    references.filter((r: ClientReference) => r.status === "matched"),
    [references]
  );

  // ID референсов также вычисляются через useMemo
  const allRefIds = useMemo(() => 
    references.map((r: ClientReference) => r.id).join(","),
    [references]
  );
  const openRefIds = useMemo(() => 
    openReferences.map((r: ClientReference) => r.id).join(","),
    [openReferences]
  );
  const matchedRefIds = useMemo(() => 
    matchedReferences.map((r: ClientReference) => r.id).join(","),
    [matchedReferences]
  );

  // Загрузить офферы для всех референсов
  const { data: allOffers = [], isLoading: allOffersLoading } = useQuery({
    queryKey: ["all-offers", allRefIds],
    queryFn: async () => {
      if (references.length === 0) return [];
      const allOffersData = await Promise.all(
        references.map((ref: ClientReference) => listOffersByReference(ref.id))
      );
      return allOffersData.flat();
    },
    enabled: references.length > 0,
  });

  // Загрузить офферы для всех открытых референсов
  const { data: allOpenOffers = [], isLoading: offersLoading } = useQuery({
    queryKey: ["all-open-offers", openRefIds],
    queryFn: async () => {
      if (openReferences.length === 0) return [];
      const allOffersData = await Promise.all(
        openReferences.map((ref: ClientReference) => listOffersByReference(ref.id))
      );
      return allOffersData.flat();
    },
    enabled: openReferences.length > 0,
  });

  // Загрузить офферы для всех мэтчей
  const { data: allMatchedOffers = [] } = useQuery({
    queryKey: ["all-matched-offers", matchedRefIds],
    queryFn: async () => {
      if (matchedReferences.length === 0) return [];
      const allOffersData = await Promise.all(
        matchedReferences.map((ref: ClientReference) => listOffersByReference(ref.id))
      );
      return allOffersData.flat();
    },
    enabled: matchedReferences.length > 0,
  });

  const handleOfferAction = async (offerId: string, action: "accepted" | "declined") => {
    setIsProcessing(offerId);
    
    // Находим оффер и референс для optimistic update
    const offer = allOpenOffers.find((o: Offer) => o.id === offerId);
    const ref = offer ? getReferenceForOffer(offer) : null;
    
    if (action === "accepted" && offer && ref) {
      // Optimistic update: обновляем статус референса в кэше
      qc.setQueryData(["my-references", session?.user?.id], (old: ClientReference[] = []) => {
        return old.map((r: ClientReference) =>
          r.id === ref.id ? { ...r, status: "matched" as const } : r
        );
      });
      
      // Обновляем кэш открытых офферов - удаляем принятый оффер
      if (openRefIds) {
        qc.setQueryData(["all-open-offers", openRefIds], (old: Offer[] = []) => {
          return old.filter((o: Offer) => o.id !== offerId);
        });
      }
      
      // Обновляем кэш всех офферов - обновляем статус оффера
      if (allRefIds) {
        qc.setQueryData(["all-offers", allRefIds], (old: Offer[] = []) => {
          return old.map((o: Offer) => 
            o.id === offerId ? { ...o, status: "accepted" as const } : o
          );
        });
      }
      
      // Инвалидируем запросы, чтобы они пересчитались с новыми queryKey
      // Это заставит React Query пересчитать openReferences и matchedReferences
      qc.invalidateQueries({ queryKey: ["my-references", session?.user?.id] });
      
      // Используем requestAnimationFrame для синхронизации с React рендером
      // После того как React пересчитает matchedRefIds, запросы обновятся автоматически
      requestAnimationFrame(() => {
        // Инвалидируем все запросы, чтобы они пересчитались с новыми queryKey
        qc.invalidateQueries({ queryKey: ["all-offers"], exact: false });
        qc.invalidateQueries({ queryKey: ["all-open-offers"], exact: false });
        qc.invalidateQueries({ queryKey: ["all-matched-offers"], exact: false });
      });
    }
    
    try {
      await patchOfferStatus(offerId, action);
      toast.success(action === "accepted" ? t('acceptedToast') : t('declinedToast'));
      
      // Инвалидируем все связанные запросы для синхронизации с сервером
      qc.invalidateQueries({ queryKey: ["all-offers"] });
      qc.invalidateQueries({ queryKey: ["all-open-offers"] });
      qc.invalidateQueries({ queryKey: ["all-matched-offers"] });
      qc.invalidateQueries({ queryKey: ["my-references", session?.user?.id] });
      
      setSelectedOffer(null);
    } catch (e) {
      // В случае ошибки откатываем optimistic update
      qc.invalidateQueries({ queryKey: ["all-offers"] });
      qc.invalidateQueries({ queryKey: ["all-open-offers"] });
      qc.invalidateQueries({ queryKey: ["all-matched-offers"] });
      qc.invalidateQueries({ queryKey: ["my-references", session?.user?.id] });
      toast.error((e as Error).message || t('error'));
    } finally {
      setIsProcessing(null);
    }
  };

  const handleOpenOfferModal = (offer: Offer) => {
    setSelectedOffer(offer);
  };

  const handleCloseOfferModal = () => {
    setSelectedOffer(null);
  };

  const handleOpenMatchedModal = (ref: ClientReference) => {
    setSelectedMatchedRef(ref);
  };

  const handleCloseMatchedModal = () => {
    setSelectedMatchedRef(null);
  };

  if (!session) {
    return <p className="text-center py-12 opacity-70">{t('needAuth')}</p>;
  }

  if (session.user?.role !== "client") {
    return <p className="text-center py-12 opacity-70">{t('clientsOnly')}</p>;
  }

  // Получить референс для каждого оффера
  const getReferenceForOffer = (offer: Offer): ClientReference | undefined => {
    return references.find((r: ClientReference) => r.id === offer.refId);
  };

  return (
    <>
      <div className="min-h-screen space-y-6 pt-16 md:pt-4">
        <div className="px-4">
          <h1 className="text-2xl font-semibold mb-2">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('subtitle')}
          </p>
        </div>

        {/* Табы фильтров */}
        <div className="px-4 flex gap-2">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
            className="flex-1"
          >
            {tCommon('all') || t('all') || 'Все'} ({allOffers.length})
          </Button>
          <Button
            variant={filter === "open" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("open")}
            className="flex-1"
          >
            {t('open')} ({allOpenOffers.length})
          </Button>
          <Button
            variant={filter === "matches" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("matches")}
            className="flex-1"
          >
            {t('matches')} ({matchedReferences.length})
          </Button>
        </div>

        {/* Контент в зависимости от выбранного фильтра */}
        {filter === "all" ? (
          <div className="space-y-4">
            {refsLoading || allOffersLoading ? (
              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="aspect-[3/4] rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            ) : allOffers.length === 0 ? (
              <p className="text-sm opacity-70 text-center py-8 px-4">{t('noResponses')}</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {allOffers.map((offer: Offer, index: number) => {
                  const ref = getReferenceForOffer(offer);
                  if (!ref) return null;
                  
                  return (
                    <div
                      key={offer.id}
                      className="relative aspect-[3/4] rounded-lg overflow-hidden cursor-pointer group"
                      onClick={() => handleOpenOfferModal(offer)}
                    >
                      <Image
                        src={ref.imageUrl}
                        alt={ref.note || tCommon('reference')}
                        fill
                        sizes="50vw"
                        className="object-cover"
                        priority={index < 2}
                      />
                      <div className="absolute top-2 left-2 z-10 px-2 py-1 rounded bg-black/50 text-white text-xs font-medium">
                        {offer.status === "accepted"
                          ? `✅ ${t('statusAccepted')}`
                          : offer.status === "declined"
                          ? `❌ ${t('statusDeclined')}`
                          : t('statusNew')}
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent text-white text-xs">
                        <p className="font-medium">{ref.city}</p>
                        {offer.pro?.name && (
                          <p className="opacity-90">{offer.pro.name}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : filter === "open" ? (
          <div className="space-y-4">
            {refsLoading || offersLoading ? (
              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="aspect-[3/4] rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            ) : allOpenOffers.length === 0 ? (
              <p className="text-sm opacity-70 text-center py-8 px-4">{t('noResponses')}</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {allOpenOffers.map((offer: Offer, index: number) => {
                  const ref = getReferenceForOffer(offer);
                  if (!ref) return null;
                  
                  return (
                    <div
                      key={offer.id}
                      className="relative aspect-[3/4] rounded-lg overflow-hidden cursor-pointer group"
                      onClick={() => handleOpenOfferModal(offer)}
                    >
                      <Image
                        src={ref.imageUrl}
                        alt={ref.note || tCommon('reference')}
                        fill
                        sizes="50vw"
                        className="object-cover"
                        priority={index < 2}
                      />
                      <div className="absolute top-2 left-2 z-10 px-2 py-1 rounded bg-black/50 text-white text-xs font-medium">
                        {offer.status === "accepted"
                          ? `✅ ${t('statusAccepted')}`
                          : offer.status === "declined"
                          ? `❌ ${t('statusDeclined')}`
                          : t('statusNew')}
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent text-white text-xs">
                        <p className="font-medium">{ref.city}</p>
                        {offer.pro?.name && (
                          <p className="opacity-90">{offer.pro.name}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {matchedReferences.length === 0 ? (
              <p className="text-sm opacity-70 text-center py-8 px-4">{t('noMatches')}</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {matchedReferences.map((ref: ClientReference, index: number) => {
                  const matchedOffer = allMatchedOffers.find(
                    (o: Offer) => o.refId === ref.id && o.status === "accepted"
                  );

                  return (
                    <div
                      key={ref.id}
                      className="relative aspect-[3/4] rounded-lg overflow-hidden cursor-pointer group"
                      onClick={() => handleOpenMatchedModal(ref)}
                    >
                      <Image
                        src={ref.imageUrl}
                        alt={ref.note || tCommon('reference')}
                        fill
                        sizes="50vw"
                        className="object-cover"
                        priority={index < 2}
                      />
                      <div className="absolute top-2 left-2 z-10 px-2 py-1 rounded bg-green-500/90 text-white text-xs font-medium">
                        ✅ {t('statusAccepted')}
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent text-white text-xs">
                        <p className="font-medium">{ref.city}</p>
                        {matchedOffer?.pro?.name && (
                          <p className="opacity-90">{matchedOffer.pro.name}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Модальное окно для оффера */}
      {selectedOffer && (() => {
        const ref = getReferenceForOffer(selectedOffer);
        if (!ref) return null;
        
        return (
          <FlipModal
            isOpen={!!selectedOffer}
            onClose={handleCloseOfferModal}
            imageUrl={ref.imageUrl}
            title={t('offerDetails')}
          >
            <div className="space-y-4">
              {/* Информация о мастере */}
              <div className="flex items-start gap-3">
                {selectedOffer.pro?.image && (
                  <Image
                    src={selectedOffer.pro.image}
                    alt={selectedOffer.pro.name || t('master')}
                    width={64}
                    height={64}
                    className="rounded-full w-16 h-16 object-cover flex-shrink-0"
                  />
                )}
                <div className="flex-1">
                  <p className="text-lg font-semibold">
                    {selectedOffer.pro?.name || `${t('master')} ${selectedOffer.proId.slice(0, 6)}`}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {new Date(selectedOffer.createdAt).toLocaleDateString()}
                  </p>
                  {selectedOffer.pro?.phone && (
                    <a
                      href={`tel:${selectedOffer.pro.phone}`}
                      className="text-sm text-blue-600 hover:underline mt-1 block"
                    >
                      {selectedOffer.pro.phone}
                    </a>
                  )}
                </div>
                <span
                  className={`text-xs font-medium px-2 py-1 rounded flex-shrink-0 ${
                    selectedOffer.status === "accepted"
                      ? "bg-green-100 text-green-700"
                      : selectedOffer.status === "declined"
                      ? "bg-red-100 text-red-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {selectedOffer.status === "accepted"
                    ? `✅ ${t('statusAccepted')}`
                    : selectedOffer.status === "declined"
                    ? `❌ ${t('statusDeclined')}`
                    : t('statusNew')}
                </span>
              </div>

              {/* Описание заказа */}
              {ref.note && (
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    {t('orderDescription')}
                  </label>
                  <p className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
                    {ref.note}
                  </p>
                </div>
              )}

              {/* Сообщение мастера */}
              {selectedOffer.message && (
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    {t('masterMessage')}
                  </label>
                  <p className="text-sm p-3 bg-muted rounded-lg">
                    {selectedOffer.message}
                  </p>
                </div>
              )}

              {/* Цена */}
              {typeof selectedOffer.pricePln === "number" && (
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    {t('price')}
                  </label>
                  <p className="text-lg font-semibold text-green-600">
                    {selectedOffer.pricePln} PLN
                  </p>
                </div>
              )}

              {/* Кнопки действий */}
              {selectedOffer.status === "offer" && (
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    onClick={() => handleOfferAction(selectedOffer.id, "accepted")}
                    disabled={isProcessing === selectedOffer.id}
                    className="flex-1"
                    size="lg"
                  >
                    {isProcessing === selectedOffer.id ? t('accepting') : t('accept')}
                  </Button>
                  <Button
                    onClick={() => handleOfferAction(selectedOffer.id, "declined")}
                    disabled={isProcessing === selectedOffer.id}
                    variant="outline"
                    className="flex-1"
                    size="lg"
                  >
                    {isProcessing === selectedOffer.id ? t('declining') : t('decline')}
                  </Button>
                </div>
              )}
            </div>
          </FlipModal>
        );
      })()}

      {/* Модальное окно для мэтча */}
      {selectedMatchedRef && (() => {
        const matchedOffer = allMatchedOffers.find(
          (o: Offer) => o.refId === selectedMatchedRef.id && o.status === "accepted"
        );
        
        return (
          <FlipModal
            isOpen={!!selectedMatchedRef}
            onClose={handleCloseMatchedModal}
            imageUrl={selectedMatchedRef.imageUrl}
            title={t('matchDetails')}
          >
            <div className="space-y-4">
              {/* Информация о мастере */}
              {matchedOffer && (
                <>
                  <div className="flex items-start gap-3">
                    {matchedOffer.pro?.image && (
                      <Image
                        src={matchedOffer.pro.image}
                        alt={matchedOffer.pro.name || t('master')}
                        width={64}
                        height={64}
                        className="rounded-full w-16 h-16 object-cover flex-shrink-0"
                      />
                    )}
                    <div className="flex-1">
                      <p className="text-lg font-semibold">
                        {matchedOffer.pro?.name || `${t('master')} ${matchedOffer.proId.slice(0, 6)}`}
                      </p>
                      {matchedOffer.pro?.phone && (
                        <a
                          href={`tel:${matchedOffer.pro.phone}`}
                          className="text-sm text-blue-600 hover:underline mt-1 block"
                        >
                          {matchedOffer.pro.phone}
                        </a>
                      )}
                    </div>
                    <span className="text-xs font-medium px-2 py-1 rounded bg-green-100 text-green-700 flex-shrink-0">
                      ✅ {t('statusAccepted')}
                    </span>
                  </div>

                  {/* Описание заказа */}
                  {selectedMatchedRef.note && (
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        {t('orderDescription')}
                      </label>
                      <p className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
                        {selectedMatchedRef.note}
                      </p>
                    </div>
                  )}

                  {/* Сообщение мастера */}
                  {matchedOffer.message && (
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        {t('masterMessage')}
                      </label>
                      <p className="text-sm p-3 bg-muted rounded-lg">
                        {matchedOffer.message}
                      </p>
                    </div>
                  )}

                  {/* Цена */}
                  {typeof matchedOffer.pricePln === "number" && (
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        {t('price')}
                      </label>
                      <p className="text-lg font-semibold text-green-600">
                        {matchedOffer.pricePln} PLN
                      </p>
                    </div>
                  )}

                  {/* Город */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      {t('city')}
                    </label>
                    <p className="text-sm">{selectedMatchedRef.city}</p>
                  </div>
                </>
              )}
            </div>
          </FlipModal>
        );
      })()}
    </>
  );
}

