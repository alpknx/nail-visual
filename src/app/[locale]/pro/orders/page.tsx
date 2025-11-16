"use client";

import { useTranslations } from 'next-intl';
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import FlipModal from "@/components/FlipModal";
import { createOffer } from "@/lib/api";

// Prevent static generation - this page requires authentication
export const dynamic = 'force-dynamic';

interface Reference {
  id: string;
  imageUrl: string;
  note?: string;
  city: string;
  tags?: string[];
  status: "open" | "matched" | "closed";
  clientId: string;
}

interface Offer {
  id: string;
  refId: string;
  proId: string;
  message?: string;
  pricePln?: number;
  status: "offer" | "accepted" | "declined";
  createdAt: string;
}

export default function ProOrdersPage() {
  const t = useTranslations('pro.orders');
  const tCommon = useTranslations('common');
  const sessionResult = useSession();
  const session = sessionResult?.data ?? null;
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | "matched" | "open">("all");
  const [selectedRef, setSelectedRef] = useState<string | null>(null);
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

  // Загрузить все референсы (для получения инфы по ним)
  const { data: allReferences = [], isLoading: refsLoading } = useQuery({
    queryKey: ["all-references"],
    queryFn: async () => {
      const res = await fetch("/api/references", { cache: "no-store" });
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    },
    refetchOnMount: true,
    staleTime: 0,
  });

  // Получить уникальные ID референсов, где есть мои офферы
  const myReferenceIds = new Set(allOffers.map((o: Offer) => o.refId));
  
  // Получить полную информацию о референсах с офферами
  const myReferences = allReferences.filter((ref: Reference) => myReferenceIds.has(ref.id));

  // Фильтровать по статусу
  let filteredReferences: Reference[] = [];
  if (filter === "all") {
    // Все референсы, где есть мои офферы
    filteredReferences = myReferences;
  } else if (filter === "open") {
    // ВСЕ открытые референсы (и с офферами, и без)
    filteredReferences = allReferences.filter((r: Reference) => r.status === "open");
  } else if (filter === "matched") {
    // Matched референсы, где есть мои офферы
    filteredReferences = myReferences.filter((r: Reference) => r.status === "matched");
  }

  const selectedReference = filteredReferences.find((r: Reference) => r.id === selectedRef);
  const selectedOffers = allOffers.filter((o: Offer) => o.refId === selectedRef);
  const hasOfferForSelected = selectedRef ? myReferenceIds.has(selectedRef) : false;

  const handleDeleteOffer = async (offerId: string) => {
    try {
      const res = await fetch(`/api/offers/${offerId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(t('deleteError'));
      toast.success(t('deleted'));
      await qc.invalidateQueries({ queryKey: ["my-offers", session?.user?.id] });
    } catch {
      toast.error(t('deleteError'));
    }
  };

  const isLoading = offersLoading || refsLoading;

  if (!session) {
    return <p className="text-center py-12 opacity-70">{t('needAuth')}</p>;
  }

  if (session.user?.role !== "pro") {
    return <p className="text-center py-12 opacity-70">{t('prosOnly')}</p>;
  }

  const handleOpenModal = (refId: string) => {
    setSelectedRef(refId);
    // Если есть оффер для этого референса, загружаем его данные
    const existingOffer = allOffers.find((o: Offer) => o.refId === refId);
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

  const handleCloseModal = () => {
    setSelectedRef(null);
    setFormData({
      message: "",
      pricePln: "",
    });
  };

  const handleCreateOffer = async () => {
    if (!selectedReference) return;

    if (!session) {
      toast.error(t('needSignIn'));
      return;
    }

    setIsSubmitting(true);
    try {
      await createOffer({
        refId: selectedReference.id,
        message: formData.message || undefined,
        pricePln: formData.pricePln ? parseInt(formData.pricePln, 10) : undefined,
      });
      toast.success(t('sent'));
      await qc.invalidateQueries({ queryKey: ["my-offers", session?.user?.id] });
      await qc.invalidateQueries({ queryKey: ["all-references"] });
      handleCloseModal();
    } catch (error) {
      toast.error(t('error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen space-y-4">
      <div className="pt-16 md:pt-4">
        <h1 className="text-2xl font-semibold mb-2">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">
          {t('subtitle')}
        </p>
      </div>

      {/* Фильтры */}
      <div className="flex flex-wrap gap-2 px-4">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
        >
          {t('all')} ({myReferences.length})
        </Button>
        <Button
          variant={filter === "open" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("open")}
        >
          {t('open')} ({allReferences.filter((r: Reference) => r.status === "open").length})
        </Button>
        <Button
          variant={filter === "matched" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("matched")}
        >
          {t('matched')} ({myReferences.filter((r: Reference) => r.status === "matched").length})
        </Button>
      </div>

      {/* Галерея референсов */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : filteredReferences.length === 0 ? (
        <p className="text-center py-12 text-sm text-muted-foreground">
          {filter === "all" && t('noOffers')}
          {filter === "open" && t('noOpenWithOffers')}
          {filter === "matched" && t('noMatched')}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2 pb-4">
          {filteredReferences.map((ref: Reference) => {
            const hasOffer = myReferenceIds.has(ref.id);
            return (
              <div
                key={ref.id}
                className="relative aspect-[3/4] rounded-lg overflow-hidden group cursor-pointer"
                onClick={() => handleOpenModal(ref.id)}
              >
                <Image
                  src={ref.imageUrl}
                  alt={ref.note || tCommon('reference')}
                  fill
                  sizes="50vw"
                  className="object-cover"
                />
                {/* Статус бейдж */}
                <div className="absolute top-2 left-2 z-10 px-2 py-1 rounded bg-black/50 text-white text-xs font-medium">
                  {ref.status === "open" ? t('openStatus') : t('matchedStatus')}
                </div>
                {/* Город и теги */}
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent text-white text-xs">
                  <p className="font-medium">{ref.city}</p>
                  {ref.tags && ref.tags.length > 0 && (
                    <p className="opacity-90">{ref.tags.slice(0, 2).join(", ")}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Модальное окно с эффектом переворота */}
      {selectedReference && (
        <FlipModal
          isOpen={!!selectedReference}
          onClose={handleCloseModal}
          imageUrl={selectedReference.imageUrl}
          title={hasOfferForSelected ? `${t('referenceNumber')}${selectedReference.id.slice(0, 6)}` : t('newOrder')}
          onSubmit={hasOfferForSelected ? undefined : handleCreateOffer}
          submitLabel={t('sendOffer')}
          submitDisabled={isSubmitting}
        >
          <div className="space-y-4">
            {/* Статус */}
            <div>
              <p className="text-xs font-medium opacity-70 mb-1">{t('status')}</p>
              <p className={`text-sm font-semibold ${
                selectedReference.status === "open" ? "text-green-600" : "text-blue-600"
              }`}>
                {selectedReference.status === "open" ? t('openStatus') : t('matchedStatus')}
              </p>
            </div>

            {/* Локация */}
            <div>
              <p className="text-xs font-medium opacity-70 mb-1">{t('location')}</p>
              <p className="text-sm font-medium">{selectedReference.city}</p>
            </div>

            {/* Теги */}
            {selectedReference.tags && selectedReference.tags.length > 0 && (
              <div>
                <p className="text-xs font-medium opacity-70 mb-1">{t('tags')}</p>
                <div className="flex flex-wrap gap-1">
                  {selectedReference.tags.map((tag: string) => (
                    <span
                      key={tag}
                      className="inline-block px-2 py-1 bg-muted rounded text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Заметка клиента */}
            {selectedReference.note && (
              <div>
                <p className="text-xs font-medium opacity-70 mb-1">{t('clientNote')}</p>
                <p className="text-sm p-3 bg-muted rounded-lg">{selectedReference.note}</p>
              </div>
            )}

            {/* Ваш оффер */}
            <div className="pt-4 border-t space-y-3">
              <h3 className="text-sm font-semibold">{t('yourOffer')}</h3>

              {hasOfferForSelected ? (
                <>
                  {selectedOffers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('notFound')}</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedOffers.map((offer: Offer) => (
                        <div
                          key={offer.id}
                          className="p-3 rounded-lg border space-y-2 bg-primary/5"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-xs font-medium opacity-70">{t('status')}</p>
                              <p className="text-sm font-semibold capitalize">
                                {offer.status === "offer" ? t('statusOffer') :
                                 offer.status === "accepted" ? t('statusAccepted') :
                                 offer.status === "declined" ? t('statusDeclined') : offer.status}
                              </p>
                            </div>
                            {offer.status === "offer" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteOffer(offer.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                {t('delete')}
                              </Button>
                            )}
                          </div>

                          <div>
                            <p className="text-xs font-medium opacity-70">{t('created')}</p>
                            <p className="text-sm">
                              {new Date(offer.createdAt).toLocaleDateString()}
                            </p>
                          </div>

                          {offer.message && (
                            <div>
                              <p className="text-xs font-medium opacity-70 mb-1">{t('message')}</p>
                              <p className="text-sm">{offer.message}</p>
                            </div>
                          )}

                          {typeof offer.pricePln === "number" && (
                            <div>
                              <p className="text-xs font-medium opacity-70 mb-1">{t('price')}</p>
                              <p className="text-sm font-semibold text-green-600">
                                💰 {offer.pricePln} PLN
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                // Форма создания нового оффера
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">{t('pricePln')}</label>
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
                    <label className="text-sm font-medium mb-2 block">{tCommon('message')}</label>
                    <Textarea
                      placeholder={t('descriptionExample')}
                      value={formData.message}
                      onChange={(e) =>
                        setFormData({ ...formData, message: e.target.value })
                      }
                      rows={4}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </FlipModal>
      )}
    </div>
  );
}
