"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from 'next-intl';
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { listOffersByReference, patchOfferStatus, type Offer, type ClientReference } from "@/lib/api";

export default function ClientOffersPage() {
  const t = useTranslations('offers.client');
  const tCommon = useTranslations('common');
  const { data: session } = useSession();
  const qc = useQueryClient();
  const [selectedRef, setSelectedRef] = useState<string | null>(null);
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
  
  // Открытые референсы
  const openReferences = references.filter((r: ClientReference) => r.status === "open");

  // Мэтчи (принятые офферы)
  const matchedReferences = references.filter((r: ClientReference) => r.status === "matched");

  const selectedReference = references.find((r: ClientReference) => r.id === selectedRef);

  // Загрузить офферы к выбранному референсу
  const { data: offers = [], isLoading: offersLoading } = useQuery({
    queryKey: ["offers", selectedRef],
    queryFn: async () => {
      if (!selectedRef) return [];
      return listOffersByReference(selectedRef);
    },
    enabled: !!selectedRef,
  });

  // Загрузить офферы для всех мэтчей
  const matchedRefIds = matchedReferences.map((r: ClientReference) => r.id);
  const { data: allMatchedOffers = [] } = useQuery({
    queryKey: ["all-matched-offers", matchedRefIds.join(",")],
    queryFn: async () => {
      if (matchedReferences.length === 0) return [];
      const allOffers = await Promise.all(
        matchedReferences.map((ref: ClientReference) => listOffersByReference(ref.id))
      );
      return allOffers.flat();
    },
    enabled: matchedReferences.length > 0,
  });

  const handleOfferAction = async (offerId: string, action: "accepted" | "declined") => {
    setIsProcessing(offerId);
    try {
      await patchOfferStatus(offerId, action);
      toast.success(action === "accepted" ? t('acceptedToast') : t('declinedToast'));
      await qc.invalidateQueries({ queryKey: ["offers", selectedRef] });
      await qc.invalidateQueries({ queryKey: ["my-references", session?.user?.id] });
    } catch (e) {
      toast.error((e as Error).message || t('error'));
    } finally {
      setIsProcessing(null);
    }
  };

  if (!session) {
    return <p className="text-center py-12 opacity-70">{t('needAuth')}</p>;
  }

  if (session.user?.role !== "client") {
    return <p className="text-center py-12 opacity-70">{t('clientsOnly')}</p>;
  }

  return (
    <div className="min-h-screen p-4 space-y-6 pt-16 md:pt-4">
      <div>
        <h1 className="text-2xl font-semibold mb-2">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">
          {t('subtitle')}
        </p>
      </div>

      {/* Открытые референсы */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">{t('open')} ({openReferences.length})</h2>
        
        {refsLoading ? (
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : openReferences.length === 0 ? (
          <p className="text-sm opacity-70 text-center py-8">{t('noOpen')}</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {openReferences.map((ref: ClientReference) => (
              <div
                key={ref.id}
                className={`relative aspect-[3/4] rounded-lg overflow-hidden border-2 cursor-pointer transition-colors ${
                  selectedRef === ref.id ? "border-primary" : "border-transparent"
                }`}
                onClick={() => setSelectedRef(ref.id)}
              >
                <Image
                  src={ref.imageUrl}
                  alt={ref.note || tCommon('reference')}
                  fill
                  sizes="50vw"
                  className="object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent text-white text-xs">
                  <p className="font-medium">{ref.city}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Офферы к выбранному референсу */}
        {selectedRef && selectedReference && (
          <div className="mt-6 space-y-4">
            <h3 className="text-lg font-semibold">{t('offersToSelected')}</h3>
            
            {offersLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="h-20 rounded border animate-pulse bg-muted" />
                ))}
              </div>
            ) : offers.length === 0 ? (
              <p className="text-sm opacity-70">{t('noResponses')}</p>
            ) : (
              <div className="space-y-3">
                {offers.map((offer: Offer) => (
                  <div
                    key={offer.id}
                    className="p-4 rounded-lg border space-y-3 hover:bg-muted/50 transition"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        {offer.pro?.image && (
                          <Image
                            src={offer.pro.image}
                            alt={offer.pro.name || "Pro"}
                            width={48}
                            height={48}
                            className="rounded-full w-12 h-12 object-cover flex-shrink-0"
                          />
                        )}
                        <div className="flex-1">
                          <p className="text-sm font-semibold">
                            {offer.pro?.name || `${t('master')} ${offer.proId.slice(0, 6)}`}
                          </p>
                          <p className="text-xs opacity-70 mt-1">
                            {new Date(offer.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded flex-shrink-0 ${
                          offer.status === "accepted"
                            ? "bg-green-100 text-green-700"
                            : offer.status === "declined"
                            ? "bg-red-100 text-red-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {offer.status === "accepted"
                          ? `✅ ${t('statusAccepted')}`
                          : offer.status === "declined"
                          ? `❌ ${t('statusDeclined')}`
                          : t('statusNew')}
                      </span>
                    </div>

                    {offer.message && (
                      <p className="text-sm">{offer.message}</p>
                    )}

                    {typeof offer.pricePln === "number" && (
                      <p className="text-sm font-semibold text-green-600">
                        {t('price')}: {offer.pricePln} PLN
                      </p>
                    )}

                    {offer.status === "offer" && (
                      <div className="flex gap-2 pt-2">
                        <Button
                          onClick={() => handleOfferAction(offer.id, "accepted")}
                          disabled={isProcessing === offer.id}
                          className="flex-1"
                          size="sm"
                        >
                          {isProcessing === offer.id ? t('accepting') : t('accept')}
                        </Button>
                        <Button
                          onClick={() => handleOfferAction(offer.id, "declined")}
                          disabled={isProcessing === offer.id}
                          variant="outline"
                          className="flex-1"
                          size="sm"
                        >
                          {isProcessing === offer.id ? t('declining') : t('decline')}
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Мэтчи */}
      <div className="space-y-4 pt-6 border-t">
        <h2 className="text-lg font-semibold">{t('matches')} ({matchedReferences.length})</h2>
        
        {matchedReferences.length === 0 ? (
          <p className="text-sm opacity-70 text-center py-8">{t('noMatches')}</p>
        ) : (
          <div className="space-y-4">
            {matchedReferences.map((ref: ClientReference) => {
              // Найти принятый оффер для этого референса
              const matchedOffer = allMatchedOffers.find(
                (o: Offer) => o.refId === ref.id && o.status === "accepted"
              );

              return (
                <div
                  key={ref.id}
                  className="p-4 rounded-lg border space-y-3 bg-green-50/50"
                >
                  <div className="flex gap-4">
                    <div className="relative w-24 h-32 rounded-lg overflow-hidden flex-shrink-0">
                      <Image
                        src={ref.imageUrl}
                        alt={ref.note || "Референс"}
                        fill
                        sizes="96px"
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div>
                        <p className="text-sm font-medium opacity-70">{t('city')}</p>
                        <p className="text-sm font-semibold">{ref.city}</p>
                      </div>
                      {ref.tags && ref.tags.length > 0 && (
                        <div>
                          <p className="text-sm font-medium opacity-70">{t('tags')}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {ref.tags.map((tag) => (
                              <span
                                key={tag}
                                className="inline-block px-2 py-1 bg-green-100 rounded text-xs"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {matchedOffer && (
                    <div className="pt-4 border-t space-y-2">
                      <div className="flex items-start gap-3">
                        {matchedOffer.pro?.image && (
                          <Image
                            src={matchedOffer.pro.image}
                            alt={matchedOffer.pro.name || t('master')}
                            width={40}
                            height={40}
                            className="rounded-full w-10 h-10 object-cover flex-shrink-0"
                          />
                        )}
                        <div className="flex-1">
                          <p className="text-sm font-semibold">
                            {matchedOffer.pro?.name || `${t('master')} ${matchedOffer.proId.slice(0, 6)}`}
                          </p>
                          {matchedOffer.pro?.phone && (
                            <a
                              href={`tel:${matchedOffer.pro.phone}`}
                              className="text-sm text-blue-600 hover:underline"
                            >
                              {matchedOffer.pro.phone}
                            </a>
                          )}
                        </div>
                      </div>
                      {matchedOffer.message && (
                        <p className="text-sm">{matchedOffer.message}</p>
                      )}
                      {typeof matchedOffer.pricePln === "number" && (
                        <p className="text-sm font-semibold text-green-600">
                          {t('price')}: {matchedOffer.pricePln} PLN
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

